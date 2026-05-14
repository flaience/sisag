"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Result = { ok: true; outbox_id: string } | { ok: false; error: string };

function onlyDigits(s: string) {
  return s.replace(/\D/g, "");
}

export function TestSendCard() {
  const [toPhone, setToPhone] = useState("");
  const [text, setText] = useState("Teste outbox SISAG");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function onSend() {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/v1/admin/whatsapp/test-send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          toPhone: onlyDigits(toPhone),
          text,
        }),
      });

      const data = (await res.json()) as any;

      if (!res.ok || !data?.ok) {
        setResult({ ok: false, error: data?.error ?? `HTTP ${res.status}` });
      } else {
        setResult({ ok: true, outbox_id: data.outbox_id });
      }
    } catch (e: any) {
      setResult({ ok: false, error: e?.message ?? "Erro desconhecido" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Teste de envio</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">
            Destino (somente dígitos)
          </label>
          <Input
            placeholder="55549912330586"
            value={toPhone}
            onChange={(e) => setToPhone(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Mensagem</label>
          <Textarea
            className="min-h-[120px]"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={onSend} disabled={loading}>
            {loading ? "Enviando..." : "Enviar teste"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setToPhone("");
              setText("Teste outbox SISAG");
              setResult(null);
            }}
            disabled={loading}
          >
            Limpar
          </Button>
        </div>

        {result ? (
          <div className="rounded-md border p-3 text-sm">
            {result.ok ? (
              <>
                <div className="font-medium">Enfileirado com sucesso</div>
                <div className="text-muted-foreground">
                  outbox_id:{" "}
                  <span className="font-mono">{result.outbox_id}</span>
                </div>
              </>
            ) : (
              <>
                <div className="font-medium">Falha</div>
                <div className="text-muted-foreground">
                  {result.ok === false ? result.error : null}
                </div>
              </>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
