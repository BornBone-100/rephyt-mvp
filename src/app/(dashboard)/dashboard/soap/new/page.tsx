export default function SoapNewPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
        SOAP 노트 생성
      </h1>
      <p className="mt-2 text-zinc-600">
        환자 기본 정보/평가 데이터를 입력받고, <code className="rounded bg-white px-1">/api/soap</code>{" "}
        호출로 결과를 받아 표시한 뒤 <code className="rounded bg-white px-1">/api/pdf</code>로 PDF를 만들면 됩니다.
      </p>
    </main>
  );
}

