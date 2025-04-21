import React from "react";
import Layout from "@/components/layout/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AssetForm from "@/components/assets/asset-form";
import { useParams } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchAsset } from "@/lib/api";

export default function UpdateAssetPage() {
  const { id } = useParams<{ id: string }>();
  
  const assetId = parseInt(id);
  
  const { data: asset, isLoading, error } = useQuery({
    queryKey: ['/api/assets', assetId],
    queryFn: () => fetchAsset(assetId),
    enabled: !isNaN(assetId)
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-[400px] w-full mt-6" />
        </div>
      </Layout>
    );
  }

  if (error || !asset) {
    return (
      <Layout>
        <div className="text-center py-10">
          <h1 className="text-2xl font-bold text-red-600">Error</h1>
          <p className="mt-2">
            {error ? (error as Error).message : "Asset not found"}
          </p>
          <Button 
            onClick={() => window.location.href = "/assets"} 
            className="mt-4"
          >
            Return to Assets
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Update Asset</h1>
          <p className="text-sm text-gray-500 mt-1">
            Update details for {asset.name}
          </p>
        </div>
        <Button onClick={() => window.location.href = "/assets"} variant="outline">
          Cancel & Return
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Asset Details</CardTitle>
        </CardHeader>
        <CardContent>
          <AssetForm 
            asset={asset}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
              window.location.href = "/assets";
            }} 
          />
        </CardContent>
      </Card>
    </Layout>
  );
}