import { api } from "@/lib/api";

export type OrgChatPeer = {
  clinic_tin: string;
  branch_name: string;
  clinic_name?: string;
  username: string;
  unread_count: number;
};

export type OrgChatMessage = {
  id: number;
  sender_tin: string;
  sender_username: string;
  body: string;
  image_url?: string;
  read_by_recipient?: boolean;
  created_at: string;
  mine: boolean;
};

export async function fetchOrgChatUnread() {
  const { data } = await api.get<{ unread_count: number }>("/clinic/org-chat/unread/");
  return data.unread_count;
}

export async function fetchOrgChatPeers() {
  const { data } = await api.get<{ org_tin: string; peers: OrgChatPeer[] }>(
    "/clinic/org-chat/peers/",
  );
  return data;
}

export async function fetchOrgChatThread(peerTin: string) {
  const { data } = await api.get<{
    thread: { id: number; org_tin: string; peer_tin: string };
    messages: OrgChatMessage[];
    unread_count: number;
  }>("/clinic/org-chat/thread/", { params: { peer_tin: peerTin } });
  return data;
}

export async function sendOrgChatMessage(peerTin: string, body: string, image_url = "") {
  const { data } = await api.post<OrgChatMessage>("/clinic/org-chat/send/", {
    peer_tin: peerTin,
    body,
    image_url,
  });
  return data;
}
