"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api, getPricingPlans } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function AdminPricingManager() {
  const queryClient = useQueryClient();
  const { data: plans = [] } = useQuery({
    queryKey: queryKeys.pricing,
    queryFn: getPricingPlans,
  });

  const mutation = useMutation({
    mutationFn: async (payload: { id: string; planKey: string; price: number }) =>
      api.put(`/admin/pricing/${payload.planKey}`, { priceUSD: payload.price }),
    onSuccess: () => {
      toast.success("Pricing updated");
      queryClient.invalidateQueries({ queryKey: queryKeys.pricing });
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {plans.map((plan) => (
        <Card key={plan._id}>
          <CardHeader>
            <CardTitle>{plan.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="number"
              defaultValue={plan.price}
              onBlur={(event) => {
                const nextPrice = Number(event.target.value);
                if (!Number.isFinite(nextPrice) || nextPrice < 0) return;
                mutation.mutate({ id: plan._id, planKey: plan.planKey ?? plan.slug, price: nextPrice });
              }}
            />
            <p className="text-sm text-muted-foreground">Duration: {plan.durationInDays} days</p>
            <Button variant="outline" onClick={() => mutation.mutate({ id: plan._id, planKey: plan.planKey ?? plan.slug, price: plan.price })}>Save current value</Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}