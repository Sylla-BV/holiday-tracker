import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function CurrentStatusSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Who's Away Today?</CardTitle>
        <CardDescription>
          <Skeleton className="h-4 w-32" />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <li key={i} className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-20" />
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}