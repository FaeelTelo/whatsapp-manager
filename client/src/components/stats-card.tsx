import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  description?: string;
  bgColor?: string;
  iconColor?: string;
}

export default function StatsCard({
  title,
  value,
  icon: Icon,
  change,
  changeType = "neutral",
  description,
  bgColor = "bg-blue-100",
  iconColor = "text-blue-600",
}: StatsCardProps) {
  const getChangeColor = () => {
    switch (changeType) {
      case "positive":
        return "text-green-600";
      case "negative":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <Card className="bg-white rounded-lg shadow-sm border border-gray-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
          </div>
          <div className={cn("p-3 rounded-full", bgColor)}>
            <Icon className={cn("h-5 w-5", iconColor)} />
          </div>
        </div>
        {(change || description) && (
          <div className="mt-4 flex items-center text-sm">
            {change && (
              <span className={getChangeColor()}>{change}</span>
            )}
            {description && (
              <span className={cn("ml-2 text-gray-500", !change && "ml-0")}>
                {description}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
