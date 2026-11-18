-- داده‌های پایه: ۲۲ منطقه تهران و محله‌های کلیدی منطقه ۴
insert into public.regions (id, name_fa, is_wave_origin_monitored, is_wave_target_monitored) values
  (1, 'منطقه ۱', true, false),
  (2, 'منطقه ۲', true, false),
  (3, 'منطقه ۳', true, false),
  (4, 'منطقه ۴', false, true),
  (5, 'منطقه ۵', true, false),
  (6, 'منطقه ۶', true, false),
  (7, 'منطقه ۷', false, false),
  (8, 'منطقه ۸', true, false),
  (9, 'منطقه ۹', false, false),
  (10, 'منطقه ۱۰', false, false),
  (11, 'منطقه ۱۱', false, false),
  (12, 'منطقه ۱۲', false, false),
  (13, 'منطقه ۱۳', false, false),
  (14, 'منطقه ۱۴', true, false),
  (15, 'منطقه ۱۵', false, false),
  (16, 'منطقه ۱۶', false, false),
  (17, 'منطقه ۱۷', false, false),
  (18, 'منطقه ۱۸', false, false),
  (19, 'منطقه ۱۹', false, false),
  (20, 'منطقه ۲۰', false, false),
  (21, 'منطقه ۲۱', false, false),
  (22, 'منطقه ۲۲', false, false)
on conflict (id) do nothing;

insert into public.neighborhoods (region_id, name_fa, slug, is_priority_target) values
  (4, 'حکیمیه', 'hakimieh', true),
  (4, 'تهرانپارس شرقی', 'tehranpars-east', false),
  (4, 'تهرانپارس غربی', 'tehranpars-west', false),
  (4, 'بلوار پروین', 'parvin-blvd', false),
  (4, 'قنات کوثر', 'ghanat-kosar', false),
  (4, 'شمس‌آباد', 'shams-abad', false),
  (4, 'مجیدآباد', 'majid-abad', false),
  (4, 'نارمک شمالی', 'north-narmak', false)
on conflict (slug) do nothing;
