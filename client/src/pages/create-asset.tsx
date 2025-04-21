import React from "react";
import Layout from "@/components/layout/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AssetForm from "@/components/assets/asset-form";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";

export default function CreateAssetPage() {

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Asset</h1>
          <p className="text-sm text-gray-500 mt-1">
            Add a new IT asset to your inventory
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