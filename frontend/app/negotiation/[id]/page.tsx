import { NegotiationClient } from "../../../components/negotiation/negotiation-client";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function NegotiationPage({ params }: PageProps) {
  const { id } = await params;
  return <NegotiationClient negotiationId={safeDecode(id)} />;
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
