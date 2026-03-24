type Props = {
  params: Promise<{ patientId: string }>;
};

export default async function PatientDetailPage({ params }: Props) {
  const { patientId } = await params;

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
        환자 상세
      </h1>
      <p className="mt-2 text-zinc-600">
        patientId: <code className="rounded bg-white px-1">{patientId}</code>
      </p>
    </main>
  );
}

