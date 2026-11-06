'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type DataPoint = { name: string; value: number };

const COLORS = ['#B3401C', '#2E6F57', '#D9A33B', '#6B4E3D', '#8FA89B', '#D3C8B8'];

export default function CategoryChart({ data }: { data: DataPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="h-[220px] flex items-center justify-center text-ink-400 text-sm">
        Belum ada data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="40%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => [`${value} terjual`, '']}
          contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }}
        />
        <Legend
          layout="vertical"
          align="right"
          verticalAlign="middle"
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span style={{ fontSize: 12, color: '#6F6455' }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
