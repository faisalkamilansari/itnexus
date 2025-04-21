import { MetricCardProps } from "@/types";
import { Card } from "@/components/ui/card";
import { ArrowDown, ArrowUp } from "lucide-react";

export default function MetricCard({
  title,
  value,
  icon,
  trend,
  accentColor
}: MetricCardProps) {
  const borderColorMap = {
    primary: "border-primary-500",
    warning: "border-warning-500",
    success: "border-success-500",
    danger: "border-danger-500",
    gray: "border-gray-500"
  };

  const iconBgMap = {
    primary: "bg-primary-100 text-primary-600",
    warning: "bg-warning-100 text-warning-500",
    success: "bg-success-100 text-success-500",
    danger: "bg-danger-100 text-danger-500",
    gray: "bg-gray-100 text-gray-600"
  };

  return (
    <Card className={`p-5 border-l-4 ${borderColorMap[accentColor]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`rounded-full p-3 ${iconBgMap[accentColor]}`}>
          {icon}
        </div>
      </div>
      
      {trend && (
        <div className="flex items-center mt-4">
          <span 
            className={`text-sm flex items-center ${
              trend.isPositive ? 'text-success-500' : 'text-danger-500'
            }`}
          >
            {trend.isPositive ? (
              <ArrowUp className="h-4 w-4 mr-1" />
            ) : (
              <ArrowDown className="h-4 w-4 mr-1" />
            )}
            {trend.value}%
          </span>
          <span className="text-sm text-gray-500 ml-2">{trend.label}</span>
        </div>
      )}
    </Card>
  );
}
