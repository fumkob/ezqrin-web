import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { EventStats } from '@/types/api';
import { Users, UserCheck, Clock, TrendingUp } from 'lucide-react';

export function EventStatsCard({ stats }: { stats: EventStats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
            <Users className="h-4 w-4" /> 参加者総数
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{stats.total_participants ?? 0}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
            <UserCheck className="h-4 w-4" /> チェックイン済み
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{stats.checked_in_count ?? 0}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" /> 未チェックイン
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{stats.pending_count ?? 0}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> 達成率
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{(stats.check_in_rate ?? 0).toFixed(1)}%</p>
        </CardContent>
      </Card>
    </div>
  );
}
