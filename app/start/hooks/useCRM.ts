import { useState, useCallback } from "react";
import { CRMState, CRMStage, EmailItem, MeetingItem } from "../types";
import { INITIAL_CRM } from "../constants";
import { nowStamp, generateUniqueId } from "../utils";

export function useCRM() {
  const [crm, setCrm] = useState<CRMState>(INITIAL_CRM);
  const [mailbox, setMailbox] = useState<EmailItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [agenda, setAgenda] = useState<MeetingItem[]>([]);

  const updateCRM = useCallback((updates: Partial<CRMState>) => {
    setCrm((prev) => ({
      ...prev,
      ...updates,
      lastUpdate: nowStamp()
    }));
  }, []);

  const updateStage = useCallback((stage: CRMStage, nextAction: string, priority?: string) => {
    setCrm((prev) => ({
      ...prev,
      stage,
      nextAction,
      priority: priority ?? prev.priority,
      lastUpdate: nowStamp()
    }));
  }, []);

  const addEmail = useCallback((item: Omit<EmailItem, "id" | "when" | "unread">) => {
    const newEmail: EmailItem = {
      id: generateUniqueId("email"),
      when: nowStamp(),
      unread: true,
      ...item
    };

    setMailbox((prev) => [newEmail, ...prev]);
    setUnreadCount((n) => n + 1);

    return newEmail;
  }, []);

  const markAllMailAsRead = useCallback(() => {
    setMailbox((prev) => prev.map((m) => ({ ...m, unread: false })));
    setUnreadCount(0);
  }, []);

  const addMeeting = useCallback((item: Omit<MeetingItem, "id">) => {
    const newMeeting: MeetingItem = {
      id: generateUniqueId("meeting"),
      ...item
    };

    setAgenda((prev) => [newMeeting, ...prev]);

    return newMeeting;
  }, []);

  const resetCRM = useCallback(() => {
    setCrm(INITIAL_CRM);
    setMailbox([]);
    setUnreadCount(0);
    setAgenda([]);
  }, []);

  return {
    crm,
    mailbox,
    unreadCount,
    agenda,
    updateCRM,
    updateStage,
    addEmail,
    markAllMailAsRead,
    addMeeting,
    resetCRM
  };
}