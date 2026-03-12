"use client";

import { useEffect, useState } from "react";
import {
  getSchedulingConfig,
  saveSchedulingConfig,
} from "@/services/scheduling-config.service";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SchedulingConfigPage() {
  const [form, setForm] = useState({
    slotDurationMinutes: 15,
    bufferMinutes: 5,
    allowOverbooking: false,
    maxAdvanceDays: 30,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await getSchedulingConfig();
        if (!data) return;

        setForm({
          slotDurationMinutes: data.slotDurationMinutes,
          bufferMinutes: data.bufferMinutes,
          allowOverbooking: data.allowOverbooking,
          maxAdvanceDays: data.maxAdvanceDays,
        });
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : Number(value),
    }));
  }

  async function handleSave() {
    try {
      setSaving(true);
      await saveSchedulingConfig(form);
      alert("Configuração salva com sucesso!");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="text-sm text-slate-500">Carregando configurações...</div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="max-w-2xl rounded-2xl">
        <CardHeader>
          <CardTitle>Parâmetros da agenda</CardTitle>
          <CardDescription>
            Essas definições afetam a geração e o comportamento dos horários.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="slotDurationMinutes">
                Duração padrão (minutos)
              </Label>
              <Input
                id="slotDurationMinutes"
                type="number"
                name="slotDurationMinutes"
                value={form.slotDurationMinutes}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bufferMinutes">Intervalo entre consultas</Label>
              <Input
                id="bufferMinutes"
                type="number"
                name="bufferMinutes"
                value={form.bufferMinutes}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="maxAdvanceDays">
                Máximo de dias para agendamento futuro
              </Label>
              <Input
                id="maxAdvanceDays"
                type="number"
                name="maxAdvanceDays"
                value={form.maxAdvanceDays}
                onChange={handleChange}
              />
            </div>
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
            <input
              type="checkbox"
              name="allowOverbooking"
              checked={form.allowOverbooking}
              onChange={handleChange}
              className="h-4 w-4"
            />
            <div>
              <p className="text-sm font-medium text-slate-900">
                Permitir overbooking
              </p>
              <p className="text-sm text-slate-500">
                Autoriza agendamentos em horários já ocupados.
              </p>
            </div>
          </label>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar configurações"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
