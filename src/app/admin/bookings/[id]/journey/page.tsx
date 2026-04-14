// src/app/admin/bookings/[id]/journey/page.tsx
"use client";

import { actionRequest } from "@/lib/ui/actionRequest";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, AlertCircle, Info, X } from "lucide-react";

import { runJourneyAction } from "./journey-actions";
import { shouldAutoRunAction } from "./journey-auto-actions";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { zonedDateTimeToUtcISOString } from "@/lib/time";

import { JourneyHeader } from "./JourneyHeader";
import { JourneyFeedbackBanner } from "./JourneyFeedbackBanner";
import { JourneyQuickSignals } from "./JourneyQuickSignals";
import { JourneyQuickActions } from "./JourneyQuickActions";
import { JourneyScorePanel } from "./JourneyScorePanel";
import { JourneyOpportunitiesPanel } from "./JourneyOpportunitiesPanel";
import { JourneyInsightsPanel } from "./JourneyInsightsPanel";
import { JourneySuggestedCommunicationsPanel } from "./JourneySuggestedCommunicationsPanel";
import { JourneyScoreBreakdownPanel } from "./JourneyScoreBreakdownPanel";
import { JourneyRescheduleModal } from "./JourneyRescheduleModal";
import { JourneyRecreateModal } from "./JourneyRecreateModal";
import { JourneyPriorityBanner } from "./JourneyPriorityBanner";
import { JourneyHealthPanel } from "./JourneyHealthPanel";

import type {
  BookingJourneyResponse,
  ActionFeedback,
  BookingQuickSignal,
  JourneyOpportunity,
  JourneyHealthItem,
  JourneySuggestedCommunication,
} from "./types";

import {
  sendSuggestedMessageRequest,
  confirmBookingRequest,
  cancelBookingRequest,
  rescheduleBookingRequest,
  recreateBookingRequest,
} from "./journey-requests";

import {
  buildWhatsAppLink,
  getErrorMessage,
  writeToClipboard,
} from "./journey-utils";

import {
  buildQuickSignals,
  buildJourneyHealth,
  buildJourneyScore,
  buildJourneyOpportunities,
  buildJourneyInsights,
  buildJourneySuggestedCommunications,
  getRelatedBookingLinks,
} from "./journey-builders";

type Props = {
  params: {
    id: string;
  };
};

function getFeedbackClasses(type: NonNullable<ActionFeedback>["type"]) {
  switch (type) {
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "error":
      return "border-rose-200 bg-rose-50 text-rose-900";
    case "info":
      return "border-sky-200 bg-sky-50 text-sky-900";
    default:
      return "border-slate-200 bg-slate-50 text-slate-900";
  }
}

function getFeedbackIcon(type: NonNullable<ActionFeedback>["type"]) {
  switch (type) {
    case "success":
      return CheckCircle2;
    case "error":
      return AlertCircle;
    case "info":
      return Info;
    default:
      return Info;
  }
}

export default function BookingJourneyPage({ params }: Props) {
  const router = useRouter();

  const [data, setData] = useState<BookingJourneyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingType, setSendingType] = useState<"pre" | "post" | null>(null);

  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleSlot, setRescheduleSlot] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [rescheduling, setRescheduling] = useState(false);

  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const [recreateOpen, setRecreateOpen] = useState(false);
  const [recreateDate, setRecreateDate] = useState("");
  const [recreateSlot, setRecreateSlot] = useState("");
  const [recreateReason, setRecreateReason] = useState("");
  const [recreating, setRecreating] = useState(false);

  const [sendingSuggestedId, setSendingSuggestedId] = useState<string | null>(
    null,
  );
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback>(null);

  const serviceSectionRef = useRef<HTMLDivElement | null>(null);
  const resourcesSectionRef = useRef<HTMLDivElement | null>(null);
  const messagesSectionRef = useRef<HTMLDivElement | null>(null);
  const automationSectionRef = useRef<HTMLDivElement | null>(null);

  const relatedBookingLinks = useMemo(() => {
    if (!data) {
      return {
        newBookingId: null,
        sourceBookingId: null,
      };
    }

    return getRelatedBookingLinks(data.events);
  }, [data]);

  const firstItem = useMemo(() => data?.items[0] ?? null, [data]);

  const journeyScoreDetails = useMemo(() => {
    if (!data) return null;

    return buildJourneyScore({
      data,
      relatedBookingLinks,
    });
  }, [data, relatedBookingLinks]);

  function showSuccess(message: string) {
    setActionFeedback({ type: "success", message });
  }

  function showError(message: string) {
    setActionFeedback({ type: "error", message });
  }

  function showInfo(message: string) {
    setActionFeedback({ type: "info", message });
  }

  async function loadJourneyRequest() {
    return await actionRequest<BookingJourneyResponse>(
      `/api/v1/bookings/${params.id}/journey`,
      {
        cache: "no-store",
      },
    );
  }

  async function loadJourney(options?: { silent?: boolean }) {
    const silent = options?.silent ?? false;

    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const result = await loadJourneyRequest();

      if (!result.ok) {
        if (!silent) {
          setData(null);
          showError(result.message || "Não foi possível carregar a jornada.");
        } else {
          showError(result.message || "Não foi possível atualizar a jornada.");
        }
        return;
      }

      setData(result.data);
    } catch {
      if (!silent) {
        setData(null);
        showError("Erro ao carregar a jornada do booking.");
      } else {
        showError("Erro ao atualizar a jornada do booking.");
      }
    } finally {
      if (silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    if (!actionFeedback) return;

    const timeout = setTimeout(() => {
      setActionFeedback(null);
    }, 4000);

    return () => clearTimeout(timeout);
  }, [actionFeedback]);

  useEffect(() => {
    loadJourney();
  }, [params.id]);

  async function handleCopyMessage(text?: string) {
    try {
      await writeToClipboard(text);
      showSuccess("Mensagem copiada com sucesso.");
    } catch (err: any) {
      showError(err?.message ?? "Não foi possível copiar a mensagem.");
    }
  }

  async function handleSend(type: "pre" | "post") {
    if (!data) return;

    try {
      setSendingType(type);
      setActionFeedback(null);

      const result = await sendSuggestedMessageRequest({
        bookingId: data.booking.id,
        type,
      });

      if (!result.ok) {
        showError(result.message || "Erro ao enviar mensagem.");
        return;
      }

      await loadJourney({ silent: true });
      showSuccess(
        result.data.message || "Mensagem enviada para o fluxo do SISAG.",
      );
    } catch (err: any) {
      showError(err?.message ?? "Erro ao enviar mensagem.");
    } finally {
      setSendingType(null);
    }
  }

  function openRescheduleModal() {
    if (!data) return;

    setActionFeedback(null);

    const current = new Date(data.booking.startTime);
    const dateIso = Number.isNaN(current.getTime())
      ? ""
      : new Date(current.getTime() - current.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 10);

    setRescheduleDate(dateIso);
    setRescheduleSlot("");
    setRescheduleReason("");
    setRescheduleOpen(true);
  }

  function closeRescheduleModal() {
    setRescheduleOpen(false);
    setRescheduleDate("");
    setRescheduleSlot("");
    setRescheduleReason("");
  }

  function scrollToSection(ref: React.RefObject<HTMLDivElement | null>) {
    ref.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function getJourneyActionHandlers() {
    return {
      confirm: handleConfirmBooking,
      cancel: handleCancelBooking,
      reschedule: openRescheduleModal,
      recreate: openRecreateModal,

      scrollToMessages: () => scrollToSection(messagesSectionRef),

      scrollToAutomation: () => scrollToSection(automationSectionRef),

      scrollToResources: () => scrollToSection(resourcesSectionRef),

      openNewBooking: (id: string) =>
        router.push(`/admin/bookings/${id}/journey`),

      openSourceBooking: (id: string) =>
        router.push(`/admin/bookings/${id}/journey`),
    };
  }

  function handleQuickSignalClick(signal: BookingQuickSignal) {
    if (!signal.actionType) return;

    switch (signal.actionType) {
      case "scroll_service":
        scrollToSection(serviceSectionRef);
        return;

      case "scroll_resources":
        scrollToSection(resourcesSectionRef);
        return;

      case "scroll_messages":
        scrollToSection(messagesSectionRef);
        return;

      case "scroll_automation":
        scrollToSection(automationSectionRef);
        return;

      case "open_new_booking":
        if (relatedBookingLinks.newBookingId) {
          router.push(
            `/admin/bookings/${relatedBookingLinks.newBookingId}/journey`,
          );
        }
        return;

      case "open_source_booking":
        if (relatedBookingLinks.sourceBookingId) {
          router.push(
            `/admin/bookings/${relatedBookingLinks.sourceBookingId}/journey`,
          );
        }
        return;
    }
  }

  async function handleConfirmReschedule() {
    if (!data) return;

    if (!rescheduleDate || !rescheduleSlot) {
      showError("Selecione a nova data e o novo horário.");
      return;
    }

    try {
      setRescheduling(true);
      setActionFeedback(null);

      const newStartTime = zonedDateTimeToUtcISOString(
        rescheduleDate,
        rescheduleSlot,
      );

      const result = await rescheduleBookingRequest({
        bookingId: data.booking.id,
        newStartTime,
        reason: rescheduleReason.trim() || null,
      });

      if (!result.ok) {
        showError(result.message || "Não foi possível reagendar o booking.");
        return;
      }

      closeRescheduleModal();
      await loadJourney({ silent: true });
      showSuccess(result.data.message || "Booking reagendado com sucesso.");
    } catch {
      showError("Erro ao reagendar booking.");
    } finally {
      setRescheduling(false);
    }
  }

  async function handleConfirmBooking() {
    if (!data) return;

    try {
      setConfirming(true);
      setActionFeedback(null);

      const result = await confirmBookingRequest(data.booking.id);

      if (!result.ok) {
        showError(result.message || "Não foi possível confirmar o booking.");
        return;
      }

      await loadJourney({ silent: true });
      showSuccess(result.data.message || "Booking confirmado com sucesso.");
    } catch {
      showError("Erro ao confirmar booking.");
    } finally {
      setConfirming(false);
    }
  }

  async function handleCancelBooking() {
    if (!data) return;

    try {
      setCancelling(true);
      setActionFeedback(null);

      const result = await cancelBookingRequest(data.booking.id);

      if (!result.ok) {
        showError(result.message || "Não foi possível cancelar o booking.");
        return;
      }

      await loadJourney({ silent: true });
      showSuccess(result.data.message || "Booking cancelado com sucesso.");
    } catch {
      showError("Erro ao cancelar booking.");
    } finally {
      setCancelling(false);
    }
  }

  function openRecreateModal() {
    if (!data) return;

    setActionFeedback(null);

    const current = new Date();
    const dateIso = new Date(
      current.getTime() - current.getTimezoneOffset() * 60000,
    )
      .toISOString()
      .slice(0, 10);

    setRecreateDate(dateIso);
    setRecreateSlot("");
    setRecreateReason("");
    setRecreateOpen(true);
  }

  function closeRecreateModal() {
    setRecreateOpen(false);
    setRecreateDate("");
    setRecreateSlot("");
    setRecreateReason("");
  }

  async function handleConfirmRecreate() {
    if (!data) return;

    if (!recreateDate || !recreateSlot) {
      showError("Selecione a nova data e o novo horário.");
      return;
    }

    try {
      setRecreating(true);
      setActionFeedback(null);

      const newStartTime = zonedDateTimeToUtcISOString(
        recreateDate,
        recreateSlot,
      );

      const result = await recreateBookingRequest({
        bookingId: data.booking.id,
        newStartTime,
        reason: recreateReason.trim() || null,
      });

      if (!result.ok) {
        showError(result.message || "Não foi possível criar um novo booking.");
        return;
      }

      showSuccess(result.data.message || "Novo booking criado com sucesso.");
      router.push(`/admin/bookings/${result.data.newBookingId}/journey`);
    } catch {
      showError("Erro ao criar novo booking.");
    } finally {
      setRecreating(false);
    }
  }

  function handleJourneyHealthAction(item: JourneyHealthItem) {
    if (!item.actionType || !data) return;

    runJourneyAction({
      type: item.actionType,
      context: {
        bookingId: data.booking.id,
        relatedBookingLinks,
      },
      handlers: getJourneyActionHandlers(),
    });
  }

  function handleNextBestAction() {
    if (!journeyScoreDetails?.nextBestActionType || !data) return;

    runJourneyAction({
      type: journeyScoreDetails.nextBestActionType,
      context: {
        bookingId: data.booking.id,
        relatedBookingLinks,
      },
      handlers: getJourneyActionHandlers(),
    });
  }

  function handleOpportunityAction(item: JourneyOpportunity) {
    if (!item.actionType || !data) return;

    runJourneyAction({
      type: item.actionType,
      context: {
        bookingId: data.booking.id,
        relatedBookingLinks,
      },
      handlers: getJourneyActionHandlers(),
    });
  }

  function openSuggestedCommunication(message: string) {
    const link = buildWhatsAppLink(data?.client.phone, message);

    if (!link) {
      showInfo("Telefone do cliente não disponível para abrir no WhatsApp.");
      return;
    }

    window.open(link, "_blank", "noopener,noreferrer");
  }

  useEffect(() => {
    if (!data || !journeyScoreDetails) return;

    const shouldRun = shouldAutoRunAction({
      priority: journeyScoreDetails.priority,
      hasNextBestAction: Boolean(journeyScoreDetails.nextBestActionType),
      hasRecentMessage: Boolean(data.lastMessage),
    });

    if (shouldRun) {
      showInfo(
        `Ação sugerida automaticamente: ${
          journeyScoreDetails.nextBestActionLabel ??
          journeyScoreDetails.nextBestAction
        }`,
      );
      handleNextBestAction();
    }
  }, [data, journeyScoreDetails]);

  async function handleSendSuggestedCommunication(
    item: JourneySuggestedCommunication,
  ) {
    if (!data) return;

    try {
      setSendingSuggestedId(item.id);
      setActionFeedback(null);

      const res = await fetch(
        `/api/v1/bookings/${data.booking.id}/send-message`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: item.message,
            origin: "journey_suggested",
          }),
        },
      );

      const response = await res.json().catch(() => null);

      if (!res.ok || !response?.ok) {
        showError(
          getErrorMessage(
            response,
            "Não foi possível enviar a mensagem pelo SISAG.",
          ),
        );
        return;
      }

      await loadJourney({ silent: true });
      showSuccess("Mensagem enviada para o fluxo do SISAG.");
    } catch {
      showError("Erro ao enviar mensagem.");
    } finally {
      setSendingSuggestedId(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Carregando jornada do booking...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        {actionFeedback && (
          <div
            className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 ${getFeedbackClasses(
              actionFeedback.type,
            )}`}
          >
            <div className="flex items-start gap-3">
              {(() => {
                const Icon = getFeedbackIcon(actionFeedback.type);
                return <Icon className="mt-0.5 h-5 w-5 shrink-0" />;
              })()}
              <p className="text-sm font-medium">{actionFeedback.message}</p>
            </div>

            <button
              type="button"
              onClick={() => setActionFeedback(null)}
              className="opacity-70 transition hover:opacity-100"
              aria-label="Fechar aviso"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Booking não encontrado.
        </div>
      </div>
    );
  }

  if (!journeyScoreDetails) {
    return null;
  }

  const quickSignals = buildQuickSignals({
    data,
    firstItem,
    relatedBookingLinks,
  });

  const journeyHealth = buildJourneyHealth({
    data,
    relatedBookingLinks,
  });

  const journeyOpportunities = buildJourneyOpportunities({
    data,
    relatedBookingLinks,
  });

  const journeyInsights = buildJourneyInsights({
    data,
    relatedBookingLinks,
  });

  const journeySuggestedCommunications = buildJourneySuggestedCommunications({
    data,
    firstItem,
    relatedBookingLinks,
  });

  const journeyScore = journeyScoreDetails.score;

  return (
    <>
      <main className="space-y-6 p-4 md:p-6">
        <JourneyHeader data={data} />

        <JourneyFeedbackBanner
          feedback={actionFeedback}
          onClose={() => setActionFeedback(null)}
        />

        {refreshing && (
          <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
            Atualizando jornada...
          </div>
        )}

        <JourneyPriorityBanner
          priority={journeyScoreDetails.priority}
          nextBestAction={journeyScoreDetails.nextBestAction}
          nextBestActionLabel={journeyScoreDetails.nextBestActionLabel}
          onRunAction={handleNextBestAction}
        />

        <JourneyQuickSignals
          signals={quickSignals}
          onSignalClick={handleQuickSignalClick}
        />

        <JourneyQuickActions
          status={data.booking.status}
          confirming={confirming}
          cancelling={cancelling}
          rescheduling={rescheduling}
          recreating={recreating}
          sendingType={sendingType}
          onConfirm={handleConfirmBooking}
          onCancel={handleCancelBooking}
          onOpenReschedule={openRescheduleModal}
          onOpenRecreate={openRecreateModal}
          onSendPre={() => handleSend("pre")}
          onSendPost={() => handleSend("post")}
        />

        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <JourneyScorePanel
              journeyScore={journeyScore}
              priority={journeyScoreDetails.priority}
              nextBestAction={journeyScoreDetails.nextBestAction}
              nextBestActionLabel={journeyScoreDetails.nextBestActionLabel}
              hasNextBestAction={Boolean(
                journeyScoreDetails.nextBestActionType,
              )}
              onNextBestAction={handleNextBestAction}
            />
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Como essa nota foi formada</CardTitle>
          </CardHeader>
          <CardContent>
            <JourneyScoreBreakdownPanel items={journeyScoreDetails.breakdown} />
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Saúde da jornada</CardTitle>
          </CardHeader>
          <CardContent>
            <JourneyHealthPanel
              items={journeyHealth}
              onAction={handleJourneyHealthAction}
            />
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Oportunidades comerciais</CardTitle>
          </CardHeader>
          <CardContent>
            <JourneyOpportunitiesPanel
              items={journeyOpportunities}
              onAction={handleOpportunityAction}
            />
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Insights automáticos</CardTitle>
          </CardHeader>
          <CardContent>
            <JourneyInsightsPanel items={journeyInsights} />
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Sugestões de comunicação</CardTitle>
          </CardHeader>
          <CardContent>
            <JourneySuggestedCommunicationsPanel
              items={journeySuggestedCommunications}
              sendingSuggestedId={sendingSuggestedId}
              onOpenWhatsApp={openSuggestedCommunication}
              onSend={handleSendSuggestedCommunication}
              onCopy={handleCopyMessage}
            />
          </CardContent>
        </Card>
      </main>

      <JourneyRescheduleModal
        open={rescheduleOpen}
        onClose={closeRescheduleModal}
        onConfirm={handleConfirmReschedule}
        loading={rescheduling}
        companyId={data.booking.companyId}
        serviceId={firstItem?.serviceId ?? null}
        professionalId={data.rescheduleTarget?.professionalId ?? null}
        durationMinutes={firstItem?.durationMinutes ?? 30}
        date={rescheduleDate}
        slot={rescheduleSlot}
        reason={rescheduleReason}
        onDateChange={setRescheduleDate}
        onSlotChange={setRescheduleSlot}
        onReasonChange={setRescheduleReason}
      />

      <JourneyRecreateModal
        open={recreateOpen}
        onClose={closeRecreateModal}
        onConfirm={handleConfirmRecreate}
        loading={recreating}
        companyId={data.booking.companyId}
        serviceId={firstItem?.serviceId ?? null}
        professionalId={data.rescheduleTarget?.professionalId ?? null}
        durationMinutes={firstItem?.durationMinutes ?? 30}
        date={recreateDate}
        slot={recreateSlot}
        reason={recreateReason}
        onDateChange={setRecreateDate}
        onSlotChange={setRecreateSlot}
        onReasonChange={setRecreateReason}
      />
    </>
  );
}
