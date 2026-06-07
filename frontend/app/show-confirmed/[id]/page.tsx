import { ShowConfirmedClient } from "../../../components/show-confirmed/show-confirmed-client";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ShowConfirmedPage({ params }: PageProps) {
  const { id } = await params;
  return <ShowConfirmedClient dealId={decodeURIComponent(id)} />;
}
