import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function WhatsAppLogsPage() {
  return (
    <div className="space-y-6">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
            Área pronta para receber a listagem real de logs do WhatsApp.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
