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
    mutationFn: async (payload: { id: string; planKey: string; price: number; compareAtPrice?: number }) =>
      api.put(`/admin/pricing/${payload.planKey}`, {
        priceUSD: payload.price,
        compareAtPriceUSD: payload.compareAtPrice,
      }),
    onSuccess: () => {
      toast.success("Pricing updated");
      queryClient.invalidateQueries({ queryKey: queryKeys.pricing });
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {plans.map((plan) => {
        let nextPrice = plan.price;
        let nextCompareAt = plan.compareAtPrice ?? plan.price;
        const save = () => {
          if (!Number.isFinite(nextPrice) || nextPrice < 0) return toast.error("Enter a valid price");
          if (!Number.isFinite(nextCompareAt) || nextCompareAt < 0) return toast.error("Enter a valid original price");
          mutation.mutate({ id: plan._id, planKey: plan.planKey ?? plan.slug, price: nextPrice, compareAtPrice: nextCompareAt });
        };

        return (
        <Card key={plan._id}>
          <CardHeader>
            <CardTitle>{plan.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Current sale price</p>
            <Input
              type="number"
              defaultValue={plan.price}
              onChange={(event) => { nextPrice = Number(event.target.value); }}
            />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Original / crossed-out price</p>
              <Input
                type="number"
                defaultValue={plan.compareAtPrice ?? plan.price}
                onChange={(event) => { nextCompareAt = Number(event.target.value); }}
              />
            </div>
            <p className="text-sm text-muted-foreground">Duration: {plan.durationInDays} days</p>
            <Button variant="outline" onClick={save} disabled={mutation.isPending}>Save pricing</Button>
          </CardContent>
        </Card>
        );
      })}
    </div>
  );
}
