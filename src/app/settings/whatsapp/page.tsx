import * as React from "react";
import { internalFetch } from "@/lib/internal-api";
import { TestSendCard } from "@/modules/whatsapp/components/test-send-card";
import type { WhatsAppStatusResponse } from "@/modules/whatsapp/contracts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

async function getStatus(): Promise<WhatsAppStatusResponse> {
  return internalFetch<WhatsAppStatusResponse>("/api/v1/admin/whatsapp/status");
}

export default async function Page(): Promise<React.ReactElement> {
  const status = await getStatus();

  const badgeVariant =
    status.connection_status === "connected"
      ? "default"
      : status.connection_status === "error" ||
          status.connection_status === "restricted"
        ? "destructive"
        : "secondary";

  return (
    <main className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">WhatsApp</h1>
        <p className="text-muted-foreground">
          Status do canal e teste de envio (outbox).
        </p>
      </header>

      {/* Mobile: 1 coluna | Desktop (lg+): 2 colunas */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="h-fit">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Conexão</CardTitle>
            <Badge variant={badgeVariant}>{status.connection_status}</Badge>
          </CardHeader>

          <CardContent className="space-y-2 text-sm">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-muted-foreground">Provider</span>
              <span className="font-mono">{status.provider}</span>
            </div>

            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-muted-foreground">Número</span>
              <span className="font-mono break-all sm:truncate">
                {status.display_number ?? "—"}
              </span>
            </div>

            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-muted-foreground">phone_number_id</span>
              <span className="font-mono break-all sm:max-w-[320px] sm:truncate">
                {status.phone_number_id ?? "—"}
              </span>
            </div>

            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-muted-foreground">waba_id</span>
              <span className="font-mono break-all sm:max-w-[320px] sm:truncate">
                {status.waba_id ?? "—"}
              </span>
            </div>

            {status.last_error ? (
              <div className="mt-3 rounded-md border p-3">
                <div className="text-sm font-medium">Último erro</div>
                <div className="text-sm text-muted-foreground break-words">
                  {status.last_error}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <TestSendCard />
      </div>
    </main>
  );
}
