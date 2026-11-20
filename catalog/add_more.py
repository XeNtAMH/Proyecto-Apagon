import json, os

RAW = 'catalog/raw'
ids = set()
extra_path = os.path.join(RAW, 'extra_devices.json')
for fn in os.listdir(RAW):
    if not fn.endswith('.json'):
        continue
    with open(os.path.join(RAW, fn), 'r', encoding='utf-8') as f:
        data = json.load(f)
    for d in data:
        ids.add(d['id'])
with open(extra_path, 'r', encoding='utf-8') as f:
    extra = json.load(f)

def mah_to_wh(mah):
    return round((mah * 3.7) / 1000.0, 2)

def uid(base):
    if base not in ids:
        ids.add(base)
        return base
    n = 2
    while f"{base}-{n}" in ids:
        n += 1
    i = f"{base}-{n}"
    ids.add(i)
    return i

def add(d):
    d = dict(d)
    d.setdefault('efficiency', 0.85)
    d.setdefault('rechargeable', True)
    d.setdefault('source', 'manual')
    d.setdefault('confidence', 'medium')
    d['id'] = uid(d['id'])
    if d['batteryWh'] <= 0 or d['chargeWatts'] <= 0:
        raise ValueError(d)
    extra.append(d)

# +50 devices
for mah, w in [(4500,10),(7000,15),(9000,18),(11000,22.5),(13000,30),(14000,30),(16000,30),(18000,45),(22000,45),(35000,30)]:
    add({'id':f'powerbank-generic-{mah}mah-{str(w).replace(".","-")}w','category':'powerbank','brand':'Genérico','model':f'Power Bank {mah} mAh {w}W','batteryWh':mah_to_wh(mah),'chargeWatts':w})

phones = [
 ('samsung-galaxy-a06-64','Samsung','Galaxy A06 64GB',5000,25,'high'),
 ('samsung-galaxy-a06-128','Samsung','Galaxy A06 128GB',5000,25,'high'),
 ('samsung-galaxy-a16-5g','Samsung','Galaxy A16 5G',5000,25,'high'),
 ('xiaomi-redmi-a5','Xiaomi','Redmi A5',5200,15,'medium'),
 ('xiaomi-redmi-14c-5g','Xiaomi','Redmi 14C 5G',5160,18,'medium'),
 ('tecno-spark-30','Tecno','Spark 30',5000,18,'medium'),
 ('infinix-smart-9','Infinix','Smart 9',5000,10,'medium'),
 ('itel-a80','Itel','A80',5000,10,'medium'),
 ('motorola-moto-g05','Motorola','Moto G05',5200,18,'medium'),
 ('nokia-c12-pro','Nokia','C12 Pro',4000,10,'medium'),
]
for id_,b,m,mah,w,c in phones:
    add({'id':id_,'category':'phone','brand':b,'model':m,'batteryWh':mah_to_wh(mah),'chargeWatts':w,'confidence':c})

laptops = [
 ('lenovo-ideapad-slim-5-14','Lenovo','IdeaPad Slim 5 14 (56.6 Wh)',56.6,65),
 ('hp-pavilion-15-eh','HP','Pavilion 15 (41 Wh)',41,45),
 ('dell-inspiron-15-3535','Dell','Inspiron 15 3535 (54 Wh)',54,65),
 ('asus-vivobook-15-x1504','ASUS','VivoBook 15 X1504 (42 Wh)',42,45),
 ('acer-aspire-3-a315','Acer','Aspire 3 A315 (40 Wh)',40,45),
]
for id_,b,m,wh,w in laptops:
    add({'id':id_,'category':'laptop','brand':b,'model':m,'batteryWh':wh,'chargeWatts':w})

tabs = [
 ('lenovo-tab-m9','Lenovo','Tab M9',19.04,10),
 ('samsung-galaxy-tab-a9-plus-wifi','Samsung','Galaxy Tab A9+ (Wi-Fi)',26.34,15),
 ('xiaomi-redmi-pad-se-4g','Xiaomi','Redmi Pad SE 4G',30.7,10),
 ('tcl-tab-10l','TCL','Tab 10L',15.17,10),
 ('amazon-fire-hd-8-2024','Amazon','Fire HD 8 (2024)',18.5,15),
]
for id_,b,m,wh,w in tabs:
    add({'id':id_,'category':'tablet','brand':b,'model':m,'batteryWh':wh,'chargeWatts':w})

routers = [
 ('router-huawei-b311-battery','Huawei','Router B311 con batería 3.000 mAh',11.1,12),
 ('router-zte-mf283-battery','ZTE','Router MF283 con batería 2.000 mAh',7.4,12),
 ('router-tenda-4g03-battery','Tenda','Router 4G03 con batería 2.600 mAh',9.62,12),
]
for id_,b,m,wh,w in routers:
    add({'id':id_,'category':'router','brand':b,'model':m,'batteryWh':wh,'chargeWatts':w})

ups2 = [
 ('ups-forza-nt-751','Forza','NT-751 750VA (96 Wh)',96,12),
 ('ups-cdp-r-upr1008','CDP','R-UPR 1008 1000VA (144 Wh)',144,15),
]
for id_,b,m,wh,w in ups2:
    add({'id':id_,'category':'ups','brand':b,'model':m,'batteryWh':wh,'chargeWatts':w,'efficiency':0.8})

fans = [
 ('fan-rech-16in-24000mah','Genérico','Ventilador recargable 16" 24.000 mAh',mah_to_wh(24000),25),
 ('fan-desk-usb-4000mah','Genérico','Ventilador de escritorio USB 4.000 mAh',mah_to_wh(4000),10),
 ('fan-clip-5000mah','Genérico','Ventilador de pinza recargable 5.000 mAh',mah_to_wh(5000),10),
]
for id_,b,m,wh,w in fans:
    add({'id':id_,'category':'fan','brand':b,'model':m,'batteryWh':wh,'chargeWatts':w})

lamps = [
 ('lamp-camping-10000mah','Genérico','Lámpara de camping 10.000 mAh',mah_to_wh(10000),18),
 ('lamp-worklight-5000mah','Genérico','Luz de trabajo recargable 5.000 mAh',mah_to_wh(5000),10),
]
for id_,b,m,wh,w in lamps:
    add({'id':id_,'category':'lamp','brand':b,'model':m,'batteryWh':wh,'chargeWatts':w})

radios = [
 ('radio-fm-am-5000mah','Genérico','Radio FM/AM 5.000 mAh',mah_to_wh(5000),10),
 ('radio-bluetooth-solar-4000','Genérico','Radio Bluetooth solar 4.000 mAh',mah_to_wh(4000),10),
]
for id_,b,m,wh,w in radios:
    add({'id':id_,'category':'radio','brand':b,'model':m,'batteryWh':wh,'chargeWatts':w})

medical = [
 ('medical-nebulizer-usb-c-2000','Genérico','Nebulizador USB-C 2.000 mAh',7.4,10),
 ('medical-hearing-aid-case-500','Genérico','Estuche cargador audífono 500 mAh',1.85,5),
]
for id_,b,m,wh,w in medical:
    add({'id':id_,'category':'medical','brand':b,'model':m,'batteryWh':wh,'chargeWatts':w,'confidence':'low'})

tools = [
 ('tool-engraver-usb-1500','Genérico','Grabador USB 1.500 mAh',5.55,10),
 ('tool-multimeter-usb-1200','Genérico','Multímetro recargable 1.200 mAh',4.44,5),
]
for id_,b,m,wh,w in tools:
    add({'id':id_,'category':'tool','brand':b,'model':m,'batteryWh':wh,'chargeWatts':w})

others = [
 ('other-ereader-generic-1500','Genérico','Lector electrónico 1.500 mAh',5.55,5),
 ('other-gps-handheld-3000','Genérico','GPS portátil 3.000 mAh',11.1,10),
 ('other-mini-printer-usb','Genérico','Mini impresora térmica USB',7.4,10),
 ('other-electric-lighter-usb','Genérico','Encendedor eléctrico USB',1.11,5),
 ('other-portable-fan-misting-2000','Genérico','Ventilador nebulizador portátil 2.000 mAh',7.4,5),
 ('other-camera-battery-np-fw50','Sony','Batería cámara NP-FW50 (equiv.)',7.3,10),
]
for id_,b,m,wh,w in others:
    add({'id':id_,'category':'other','brand':b,'model':m,'batteryWh':wh,'chargeWatts':w})

with open(extra_path, 'w', encoding='utf-8') as f:
    json.dump(extra, f, ensure_ascii=False, indent=2)
print('EXTRA_TOTAL', len(extra))
print('TOTAL_IDS', len(ids))
