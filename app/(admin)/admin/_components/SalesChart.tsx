'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';

type DataPoint = { tanggal: string; penjualan: number };

function formatRupiah(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(0)}jt`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}rb`;
  return value.toString();
}

export default function SalesChart({ data }: { data: DataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#B3401C" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#B3401C" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#EFE8DC" />
        <XAxis dataKey="tanggal" tick={{ fontSize: 11, fill: '#8B7F6F' }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={formatRupiah} tick={{ fontSize: 11, fill: '#8B7F6F' }} axisLine={false} tickLine={false} width={36} />
        <Tooltip
          formatter={(value: number) => [`Rp ${value.toLocaleString('id-ID')}`, 'Penjualan']}
          contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }}
        />
        <Area
          type="monotone"
          dataKey="penjualan"
          stroke="#B3401C"
          strokeWidth={2.5}
          fill="url(#salesGradient)"
          dot={{ fill: '#B3401C', r: 4, strokeWidth: 0 }}
          activeDot={{ r: 6, fill: '#B3401C' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
