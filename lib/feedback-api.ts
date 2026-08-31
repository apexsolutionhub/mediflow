import { api } from "@/lib/api";

export type ClinicFeedbackMessage = {
  id: number;
  sender_side: "tenant" | "apex" | string;
  body: string;
  image_url?: string;
  sender_username: string;
  created_at: string;
  read_by_tenant?: boolean;
  read_by_apex?: boolean;
};

export type ClinicFeedbackThread = {
  id: number;
  clinic_tin: string;
  status: string;
  clinic_name: string;
};

export async function fetchClinicFeedbackUnread() {
  const { data } = await api.get<{ unread_count: number }>("/billing/feedback/unread/");
  return data.unread_count;
}

export async function fetchClinicFeedbackThread() {
  const { data } = await api.get<{
    thread: ClinicFeedbackThread;
    messages: ClinicFeedbackMessage[];
    unread_count: number;
  }>("/billing/feedback/");
  return data;
}

export async function sendClinicFeedbackMessage(body: string, image_url = "") {
  const { data } = await api.post<ClinicFeedbackMessage>("/billing/feedback/send/", {
    body,
    image_url,
  });
  return data;
}
