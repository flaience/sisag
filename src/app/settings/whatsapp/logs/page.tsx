//src/app/settings/whatsapp/logs/page.tsx
import * as React from "react";
import Link from "next/link";
import { internalFetch } from "@/lib/internal-api";
import type {
  WhatsAppLogsResponse,
  WhatsAppLogItem,
} from "@/modules/whatsapp/contracts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function badgeVariant(status: WhatsAppLogItem["status"]) {
  if (status === "sent") return "default";
  if (status === "failed" || status === "dead") return "destructive";
  return "secondary";
}

async function getLogs(): Promise<WhatsAppLogsResponse> {
  return internalFetch<WhatsAppLogsResponse>(
    "/api/v1/admin/whatsapp/logs?limit=20",
  );
}

export default async function Page(): Promise<React.ReactElement> {
  const data = await getLogs();

  return (
    <main className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">WhatsApp Logs</h1>
          <p className="text-muted-foreground">
            Outbox + envio (mock por enquanto).
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/settings/whatsapp">Voltar</Link>
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Últimos envios</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {data.items.length === 0 ? (
            <div className="text-sm text-muted-foreground">Sem registros.</div>
          ) : (
            <div className="space-y-2">
              {data.items.map((it) => (
                <div
                  key={it.outbox_id}
                  className="flex min-w-0 flex-col gap-2 rounded-md border p-3 sm:gap-1 md:flex-row md:items-center md:justify-between"
                >
                  {/* esquerda */}
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={badgeVariant(it.status)}>
                        {it.status}
                      </Badge>

                      {/* id: quebra no mobile, trunca no desktop */}
                      <span className="font-mono text-xs text-muted-foreground break-all md:max-w-[420px] md:truncate">
                        {it.outbox_id}
                      </span>
                    </div>

                    <div className="text-sm">
                      <span className="text-muted-foreground">Para:</span>{" "}
                      <span className="font-mono break-all">
                        {it.to_phone ?? "—"}
                      </span>{" "}
                      <span className="text-muted-foreground">
                        • tentativas:
                      </span>{" "}
                      <span className="font-mono">{it.attempts}</span>
                    </div>

                    <div className="text-sm text-muted-foreground break-words">
                      {it.text_preview ?? "—"}
                    </div>

                    {it.last_error ? (
                      <div className="text-sm text-destructive break-words">
                        {it.last_error}
                      </div>
                    ) : null}
                  </div>

                  {/* direita */}
                  <div className="text-xs text-muted-foreground md:text-right">
                    <div className="md:whitespace-nowrap">
                      {new Date(it.created_at).toLocaleString()}
                    </div>
                    <div className="font-mono break-all md:max-w-[260px] md:truncate">
                      {it.provider_message_id ?? "—"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
