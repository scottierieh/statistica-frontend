
'use client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, RefreshCw } from "lucide-react";

export default function HistoryPage() {

    const handleRevert = (commitSha: string) => {
        // Placeholder for revert logic
        console.log("Reverting to commit:", commitSha);
    }

    // This would typically be fetched from a Git history API
    const history = [
        { sha: 'a1b2c3d', message: 'feat: Add correlation matrix heatmap', time: '2 hours ago' },
        { sha: 'e4f5g6h', message: 'fix: Corrected ANOVA p-value calculation', time: '5 hours ago' },
        { sha: 'i7j8k9l', message: 'refactor: Improved data parsing logic', time: '1 day ago' },
        { sha: 'm0n1p2q', message: 'Initial commit for statistical analysis tools', time: '3 days ago' },
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2">
                    <Clock />
                    File Change History
                </CardTitle>
                <CardDescription>
                    Review recent changes made to the application code. You can revert to a previous state if needed.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ul className="space-y-4">
                    {history.map(commit => (
                        <li key={commit.sha} className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
                            <div className="flex items-center gap-4">
                                <div className="font-mono text-sm text-muted-foreground bg-background px-2 py-1 rounded">
                                    {commit.sha.substring(0, 7)}
                                </div>
                                <div>
                                    <p className="font-semibold">{commit.message}</p>
                                    <p className="text-xs text-muted-foreground">{commit.time}</p>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => handleRevert(commit.sha)}>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Revert
                            </Button>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
}
