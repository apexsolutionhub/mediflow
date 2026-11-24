import axios from "axios";

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

/**
 * On a clinic server the chat lives in the cloud only: when the cloud cannot be reached the chat is
 * unavailable (nothing is queued), and the server says so with this code.
 */
export function isCloudUnreachable(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.data?.code === "cloud_unreachable";
}

export async function fetchClinicFeedbackUnread() {
  const { data } = await api.get<{ unread_count: number; cloud_unreachable?: boolean }>("/billing/feedback/unread/");
  return { count: data.unread_count, cloudUnreachable: Boolean(data.cloud_unreachable) };
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
