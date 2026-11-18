import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
} from 'react-native';
import { isSupabaseConfigured, supabase } from './src/lib/supabase';

type TabKey = 'dashboard' | 'charts' | 'usd' | 'wave';
type MetricType = 'listing' | 'transaction';
type CurrencyType = 'toman' | 'usd';

interface RegionRow {
  id: number;
  name_fa: string;
  is_wave_origin_monitored: boolean;
  is_wave_target_monitored: boolean;
}

interface NeighborhoodRow {
  id: string;
  region_id: number;
  name_fa: string;
  slug: string;
  is_priority_target: boolean;
}

interface MarketStatRow {
  stat_date: string;
  sample_count: number;
  avg_price_per_sqm_toman: number | null;
  median_price_per_sqm_toman: number | null;
  is_sufficient_data: boolean;
  insufficient_reason: string | null;
}

interface UsdRateRow {
  rate_date: string;
  rate_type: string;
  rate_toman: number;
  is_carried_forward: boolean;
}

const TIMEFRAMES = [
  '۱ روز',
  '۲ روز',
  '۳ روز',
  '۱ هفته',
  '۲ هفته',
  '۱ ماه',
  '۲ ماه',
  '۳ ماه',
  '۶ ماه',
  '۱ سال',
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [regions, setRegions] = useState<RegionRow[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<NeighborhoodRow[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<number>(4);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('all');
  const [metricType, setMetricType] = useState<MetricType>('listing');
  const [currency, setCurrency] = useState<CurrencyType>('toman');
  const [timeframe, setTimeframe] = useState<string>('۱ ماه');

  const [latestStat, setLatestStat] = useState<MarketStatRow | null>(null);
  const [latestUsd, setLatestUsd] = useState<UsdRateRow | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // بارگذاری مناطق و محله‌ها از Supabase
  useEffect(() => {
    if (!supabase) return;
    (async () => {
      const { data: regData } = await supabase
        .from('regions')
        .select('id,name_fa,is_wave_origin_monitored,is_wave_target_monitored')
        .order('id', { ascending: true });
      if (regData) setRegions(regData);

      const { data: nbData } = await supabase
        .from('neighborhoods')
        .select('id,region_id,name_fa,slug,is_priority_target')
        .eq('region_id', 4)
        .order('name_fa', { ascending: true });
      if (nbData) setNeighborhoods(nbData);

      const { data: usdData } = await supabase
        .from('usd_rates')
        .select('rate_date,rate_type,rate_toman,is_carried_forward')
        .order('rate_date', { ascending: false })
        .limit(1);
      if (usdData && usdData.length > 0) setLatestUsd(usdData[0]);
    })();
  }, []);

  // بارگذاری آمار منطقه/محله انتخاب‌شده
  useEffect(() => {
    if (!supabase) return;
    setLoading(true);
    (async () => {
      let query = supabase
        .from('market_stats')
        .select(
          'stat_date,sample_count,avg_price_per_sqm_toman,median_price_per_sqm_toman,is_sufficient_data,insufficient_reason'
        )
        .eq('region_id', selectedRegion)
        .eq('metric_type', metricType)
        .order('stat_date', { ascending: false })
        .limit(1);

      if (selectedRegion === 4 && selectedNeighborhood !== 'all') {
        query = query.eq('neighborhood_id', selectedNeighborhood);
      } else {
        query = query.is('neighborhood_id', null);
      }

      const { data } = await query;
      setLatestStat(data && data.length > 0 ? data[0] : null);
      setLoading(false);
    })();
  }, [selectedRegion, selectedNeighborhood, metricType]);

  const currentNeighborhoodName =
    selectedRegion === 4
      ? selectedNeighborhood === 'all'
        ? 'کل منطقه ۴'
        : neighborhoods.find((n) => n.id === selectedNeighborhood)?.name_fa ?? 'منطقه ۴'
      : `کل منطقه ${selectedRegion}`;

  const formatNumber = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '— — —';
    if (currency === 'usd') {
      if (!latestUsd || !latestUsd.rate_toman) return 'نرخ دلار ثبت‌نشده';
      return `$${Math.round(val / latestUsd.rate_toman).toLocaleString('en-US')}`;
    }
    return `${val.toLocaleString('fa-IR')} تومان`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.topbar}>
        <View style={[styles.statusPill, isSupabaseConfigured && styles.statusPillConnected]}>
          <Text
            style={[
              styles.statusPillText,
              isSupabaseConfigured && styles.statusPillTextConnected,
            ]}
          >
            {isSupabaseConfigured ? 'متصل به Supabase' : 'در انتظار اتصال داده'}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.topbarTitle}>مسکن تهران</Text>
          <Text style={styles.topbarSub}>پایش هوشمند قیمت و معاملات</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {activeTab === 'dashboard' && (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>نوع شاخص (تفکیک‌شده)</Text>
              <View style={styles.segment}>
                <TouchableOpacity
                  style={[styles.segmentBtn, metricType === 'transaction' && styles.segmentBtnActive]}
                  onPress={() => setMetricType('transaction')}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      metricType === 'transaction' && styles.segmentTextActive,
                    ]}
                  >
                    قیمت معامله‌شده
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.segmentBtn, metricType === 'listing' && styles.segmentBtnActive]}
                  onPress={() => setMetricType('listing')}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      metricType === 'listing' && styles.segmentTextActive,
                    ]}
                  >
                    قیمت آگهی‌شده
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.sectionLabel}>واحد نمایش</Text>
              <View style={[styles.segment, { marginBottom: 4 }]}>
                <TouchableOpacity
                  style={[styles.segmentBtn, currency === 'usd' && styles.segmentBtnActive]}
                  onPress={() => setCurrency('usd')}
                >
                  <Text style={[styles.segmentText, currency === 'usd' && styles.segmentTextActive]}>
                    دلار / مترمربع
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.segmentBtn, currency === 'toman' && styles.segmentBtnActive]}
                  onPress={() => setCurrency('toman')}
                >
                  <Text
                    style={[styles.segmentText, currency === 'toman' && styles.segmentTextActive]}
                  >
                    تومان / مترمربع
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionLabel}>منطقه (۲۲ منطقه تهران)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
                {regions.map((r) => {
                  const active = r.id === selectedRegion;
                  return (
                    <TouchableOpacity
                      key={r.id}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => {
                        setSelectedRegion(r.id);
                        setSelectedNeighborhood('all');
                      }}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {r.name_fa}
                        {r.is_wave_target_monitored ? ' ★' : r.is_wave_origin_monitored ? ' •' : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {selectedRegion === 4 && (
                <>
                  <Text style={styles.sectionLabel}>محله‌های منطقه ۴</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
                    <TouchableOpacity
                      style={[styles.chip, selectedNeighborhood === 'all' && styles.chipActive]}
                      onPress={() => setSelectedNeighborhood('all')}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          selectedNeighborhood === 'all' && styles.chipTextActive,
                        ]}
                      >
                        کل منطقه ۴
                      </Text>
                    </TouchableOpacity>
                    {neighborhoods.map((n) => {
                      const active = n.id === selectedNeighborhood;
                      return (
                        <TouchableOpacity
                          key={n.id}
                          style={[styles.chip, active && styles.chipActive]}
                          onPress={() => setSelectedNeighborhood(n.id)}
                        >
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>
                            {n.name_fa}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              )}

              <Text style={styles.sectionLabel}>بازه مقایسه</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
                {TIMEFRAMES.map((tf) => {
                  const active = tf === timeframe;
                  return (
                    <TouchableOpacity
                      key={tf}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setTimeframe(tf)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{tf}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.card}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardSubLabel}>بازه: {timeframe}</Text>
                <Text style={styles.cardTitle}>
                  منطقه {selectedRegion} — {currentNeighborhoodName}
                </Text>
              </View>

              <View style={styles.heroBox}>
                <View style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>
                    {metricType === 'listing' ? 'شاخص آگهی‌شده' : 'شاخص معامله‌شده'}
                  </Text>
                </View>
                {loading ? (
                  <ActivityIndicator size="small" color="#0F766E" style={{ marginVertical: 12 }} />
                ) : (
                  <Text style={styles.heroVal}>
                    {formatNumber(latestStat?.avg_price_per_sqm_toman)}
                  </Text>
                )}
                <Text style={styles.heroSub}>
                  {currency === 'toman' ? 'میانگین هر مترمربع (تومان)' : 'میانگین هر مترمربع (دلار)'}
                </Text>
              </View>

              <View style={styles.metaGrid}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>تعداد نمونه</Text>
                  <Text style={styles.metaVal}>
                    {latestStat ? `${latestStat.sample_count} مورد` : '۰ (کمبود داده)'}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>میانه قیمت</Text>
                  <Text style={styles.metaVal}>
                    {formatNumber(latestStat?.median_price_per_sqm_toman)}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>منبع داده</Text>
                  <Text style={styles.metaVal}>
                    {metricType === 'listing' ? 'پلتفرم آگهی' : 'بانک مرکزی / کد رهگیری'}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>به‌روزرسانی</Text>
                  <Text style={styles.metaVal}>{latestStat?.stat_date ?? 'ثبت‌نشده'}</Text>
                </View>
              </View>
            </View>
          </>
        )}

        {activeTab === 'charts' && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>روند تاریخی قیمت (آگهی در برابر معامله)</Text>
              <View style={styles.chartBox}>
                <Text style={styles.chartBoxText}>
                  با ثبت رکوردهای روزانه در جدول market_stats، نمودار خطی روند قیمت اینجا رسم
                  می‌شود.
                </Text>
              </View>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>تعداد معاملات ماهانه به تفکیک منطقه</Text>
              <View style={styles.chartBox}>
                <Text style={styles.chartBoxText}>
                  مقایسهٔ حجم معاملات ماهانه پس از ورود داده‌های رسمی نمایش داده می‌شود.
                </Text>
              </View>
            </View>
          </>
        )}

        {activeTab === 'usd' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>تاریخچه نرخ دلار و قیمت دلاری مسکن</Text>
            <View style={[styles.heroBox, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
              <View style={[styles.heroBadge, { backgroundColor: '#E0F2FE' }]}>
                <Text style={[styles.heroBadgeText, { color: '#0284C7' }]}>نرخ بازار آزاد</Text>
              </View>
              <Text style={styles.heroVal}>
                {latestUsd ? `${latestUsd.rate_toman.toLocaleString('fa-IR')} تومان` : '— — —'}
              </Text>
              <Text style={styles.heroSub}>
                {latestUsd ? `تاریخ: ${latestUsd.rate_date}` : 'نرخ مرجع روز ثبت‌نشده'}
              </Text>
            </View>
          </View>
        )}

        {activeTab === 'wave' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>پایش موج احتمالی قیمت</Text>
            <Text style={styles.waveDesc}>
              پایش روزانهٔ مناطق مبدأ (۱، ۲، ۳، ۵، ۶، ۸، ۱۴) و بررسی احتمال انتقال موج به منطقه ۴ و
              محلهٔ حکیمیه در بازه‌های ۷، ۱۴ و ۳۰ روزه.
            </Text>
            <View style={styles.warnBox}>
              <Text style={styles.warnBoxLabel}>وضعیت تحلیل تاریخی</Text>
              <Text style={styles.warnBoxVal}>
                در انتظار تکمیل تاریخچهٔ روزانه برای آزمون الگوهای تکرارشونده
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.bottomNav}>
        {(
          [
            { key: 'wave', label: 'هشدار موج' },
            { key: 'usd', label: 'نرخ دلار' },
            { key: 'charts', label: 'نمودارها' },
            { key: 'dashboard', label: 'داشبورد' },
          ] as { key: TabKey; label: string }[]
        ).map((tab) => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.navItem}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.navText, active && styles.navTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  topbar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topbarTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  topbarSub: { fontSize: 11, color: '#64748B', marginTop: 2 },
  statusPill: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusPillConnected: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  statusPillText: { color: '#92400E', fontSize: 10, fontWeight: '700' },
  statusPillTextConnected: { color: '#065F46' },
  container: { padding: 16, paddingBottom: 90 },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 8,
    marginBottom: 8,
    textAlign: 'right',
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    padding: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  segmentBtn: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: '#FFFFFF' },
  segmentText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  segmentTextActive: { color: '#0F766E' },
  chips: { marginBottom: 6 },
  chip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
  },
  chipActive: { backgroundColor: '#0F766E', borderColor: '#0F766E' },
  chipText: { fontSize: 12, color: '#64748B' },
  chipTextActive: { color: '#FFFFFF', fontWeight: '700' },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', textAlign: 'right' },
  cardSubLabel: { fontSize: 11, color: '#64748B' },
  heroBox: {
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 12,
    backgroundColor: '#F0FDFA',
    borderColor: '#CCFBF1',
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 14,
  },
  heroBadge: {
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 8,
  },
  heroBadgeText: { color: '#0F766E', fontSize: 11, fontWeight: '700' },
  heroVal: { fontSize: 28, fontWeight: '800', color: '#0F172A' },
  heroSub: { fontSize: 12, color: '#64748B', marginTop: 4 },
  metaGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  metaItem: {
    width: '48%',
    backgroundColor: '#F1F5F9',
    padding: 10,
    borderRadius: 10,
  },
  metaLabel: { fontSize: 11, color: '#64748B', textAlign: 'right', marginBottom: 3 },
  metaVal: { fontSize: 12, fontWeight: '700', color: '#0F172A', textAlign: 'right' },
  chartBox: {
    height: 160,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginTop: 10,
  },
  chartBoxText: { fontSize: 12, color: '#64748B', textAlign: 'center', lineHeight: 18 },
  waveDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 20,
    textAlign: 'right',
    marginTop: 8,
    marginBottom: 12,
  },
  warnBox: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  warnBoxLabel: { fontSize: 11, color: '#92400E', textAlign: 'right', marginBottom: 4 },
  warnBoxVal: { fontSize: 12, fontWeight: '700', color: '#92400E', textAlign: 'right' },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    paddingVertical: 12,
  },
  navItem: { flex: 1, alignItems: 'center' },
  navText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  navTextActive: { color: '#0F766E', fontWeight: '700' },
});
