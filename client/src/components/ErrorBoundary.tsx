import React from "react";
import { AlertOctagon, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8 bg-background">
          <Card className="max-w-lg w-full">
            <CardContent className="p-8 text-center">
              <AlertOctagon className="w-16 h-16 mx-auto mb-4 text-destructive" />
              <h2 className="text-xl font-bold mb-2">حدث خطأ غير متوقع</h2>
              <p className="text-muted-foreground mb-4">
                {this.state.error?.message ?? "Something went wrong"}
              </p>
              <Button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = "/";
                }}
              >
                <RefreshCw className="w-4 h-4 ml-2" />
                العودة للرئيسية
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}
