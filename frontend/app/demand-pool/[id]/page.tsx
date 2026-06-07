import { DemandPoolClient } from "../../../components/demand-pool/demand-pool-client";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function DemandPoolPage({ params }: PageProps) {
  const { id } = await params;
  return <DemandPoolClient demandId={decodeURIComponent(id)} />;
}
