"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

export function AdminAffiliatePayouts() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-affiliate-payouts"],
    queryFn: async () => {
      const res = await api.get("/admin/affiliate/payouts");
      return res.data;
    },
  });

  const approve = useMutation({
    mutationFn: (id: string) => api.put(`/admin/affiliate/payouts/${id}/approve`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-affiliate-payouts"] }),
  });
  const markPaid = useMutation({
    mutationFn: (id: string) => api.put(`/admin/affiliate/payouts/${id}/mark-paid`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-affiliate-payouts"] }),
  });
  const reject = useMutation({
    mutationFn: (id: string) => api.put(`/admin/affiliate/payouts/${id}/reject`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-affiliate-payouts"] }),
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payout Requests</CardTitle>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th>User</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((p: any) => (
              <tr key={p.id}>
                <td>{p.user}</td>
                <td>{p.amount}</td>
                <td>{p.method}</td>
                <td>{p.status}</td>
                <td className="flex gap-2">
                  <Button size="sm" onClick={() => approve.mutate(p.id)}>Approve</Button>
                  <Button size="sm" onClick={() => markPaid.mutate(p.id)}>Mark as Paid</Button>
                  <Button size="sm" variant="destructive" onClick={() => reject.mutate(p.id)}>Reject</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
