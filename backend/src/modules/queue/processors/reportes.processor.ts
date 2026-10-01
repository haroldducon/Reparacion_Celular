import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
import { COLA_REPORTES_IA } from '../queue.constants';

const MODELO_POR_DEFECTO = 'gemini-3.6-flash';

@Processor(COLA_REPORTES_IA)
export class ReportesProcessor extends WorkerHost {
  constructor(private prisma: PrismaService) {
    super();
  }

  async process(job: Job<{ reporteId: string }>) {
    const reporte = await this.prisma.reporteIA.findUnique({ where: { id: job.data.reporteId } });
    if (!reporte) return;

    await this.prisma.reporteIA.update({
      where: { id: reporte.id },
      data: { estado: 'PROCESANDO' },
    });

    try {
      // metricasInput ya viene agregado (sin nombres ni teléfonos de clientes) desde
      // reportes.service.ts, para minimizar lo que se envía al modelo.
      const texto = await this.generarInforme(reporte.metricasInput);

      await this.prisma.reporteIA.update({
        where: { id: reporte.id },
        data: { estado: 'COMPLETADO', resumenTexto: texto, completadoAt: new Date(), error: null },
      });
    } catch (err: any) {
      await this.prisma.reporteIA.update({
        where: { id: reporte.id },
        data: { estado: 'ERROR', error: String(err?.message ?? err).slice(0, 300) },
      });
      // Sin clave configurada no tiene sentido reintentar
      if (!process.env.GEMINI_API_KEY) return;
      throw err;
    }
  }

  private async generarInforme(metricas: unknown): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('El informe con IA no está configurado (falta GEMINI_API_KEY).');
    const modelo = process.env.GEMINI_MODEL || MODELO_POR_DEFECTO;

    const instrucciones = `Eres un analista de negocio para un taller de reparación de celulares.
Recibirás métricas agregadas de un período (JSON). Escribe un informe en español, claro y útil para el dueño del taller.

Estructura (usa exactamente estos títulos con "## "):
## Resumen
2-3 frases con lo más importante del período.
## Hallazgos
Entre 3 y 6 viñetas con "- ", cada una con cifras concretas tomadas de los datos.
## Alertas
Viñetas con "- " solo si hay algo preocupante (márgenes bajos, cancelaciones, equipos tardando demasiado, caída de ingresos). Si no hay nada, escribe "- Sin alertas relevantes."
## Recomendaciones
Entre 2 y 4 acciones concretas con "- ".

Reglas: la ganancia es lo cobrado menos el costo de repuestos (no restes mano de obra). No inventes cifras ni causas que no estén en los datos; si el período tiene pocos datos, dilo. Formatea el dinero como pesos colombianos (ej. $150.000). No uses tablas ni código.`;

    const respuesta = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`,
      {
        method: 'POST',
        signal: AbortSignal.timeout(60_000),
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: instrucciones }] },
          contents: [{ role: 'user', parts: [{ text: `Métricas del período:\n${JSON.stringify(metricas)}` }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 4096 },
        }),
      },
    );

    if (!respuesta.ok) {
      // no se reenvía el cuerpo completo al usuario: puede contener detalles internos
      throw new Error(`La API de IA respondió con estado ${respuesta.status}`);
    }
    const data: any = await respuesta.json();
    if (data.promptFeedback?.blockReason) throw new Error('La IA bloqueó la solicitud.');
    const texto = (data.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text ?? '').join('').trim();
    if (!texto) throw new Error('La IA devolvió una respuesta vacía');
    return texto;
  }
}
