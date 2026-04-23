"use client";

export default function PatientsLoading() {
  return (
    <div className="min-h-screen animate-pulse bg-zinc-50 p-6 pb-32 md:p-10">
      <div className="mb-8 flex flex-col justify-between gap-4 border-b border-zinc-200 pb-6 md:flex-row md:items-end">
        <div className="space-y-3">
          <div className="h-9 w-56 rounded-xl bg-zinc-200" />
          <div className="h-4 w-80 rounded-lg bg-zinc-100" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-12 w-20 rounded-xl bg-zinc-200" />
          <div className="h-12 w-24 rounded-xl bg-zinc-200" />
          <div className="h-12 w-36 rounded-xl bg-orange-200" />
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 bg-zinc-50/40 p-4 md:p-5">
          <div className="h-12 w-full rounded-xl bg-zinc-100" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50/50 text-zinc-500">
              <tr>
                <th className="px-6 py-5">
                  <div className="h-3 w-20 rounded bg-zinc-200" />
                </th>
                <th className="px-6 py-5">
                  <div className="h-3 w-24 rounded bg-zinc-200" />
                </th>
                <th className="px-6 py-5">
                  <div className="h-3 w-16 rounded bg-zinc-200" />
                </th>
                <th className="px-6 py-5">
                  <div className="h-3 w-14 rounded bg-zinc-200" />
                </th>
                <th className="px-6 py-5 text-right">
                  <div className="ml-auto h-3 w-12 rounded bg-zinc-200" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {Array.from({ length: 6 }).map((_, index) => (
                <tr key={`patients-loading-row-${index}`}>
                  <td className="px-6 py-5">
                    <div className="h-4 w-28 rounded bg-zinc-200" />
                  </td>
                  <td className="px-6 py-5">
                    <div className="h-4 w-24 rounded bg-zinc-100" />
                  </td>
                  <td className="px-6 py-5">
                    <div className="h-4 w-40 rounded bg-zinc-100" />
                  </td>
                  <td className="px-6 py-5">
                    <div className="h-4 w-32 rounded bg-zinc-100" />
                  </td>
                  <td className="px-6 py-5">
                    <div className="ml-auto flex justify-end gap-2">
                      <div className="h-8 w-16 rounded-lg bg-zinc-200" />
                      <div className="h-8 w-14 rounded-lg bg-rose-100" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
