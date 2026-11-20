import json
import os

RAW_DIR = os.path.join(os.path.dirname(__file__), "raw")

def load_existing_ids():
    ids = set()
    for fn in os.listdir(RAW_DIR):
        if not fn.endswith('.json'):
            continue
        path = os.path.join(RAW_DIR, fn)
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        if isinstance(data, list):
            for d in data:
                if isinstance(d, dict) and 'id' in d:
                    ids.add(d['id'])
    return ids

def mah_to_wh(mah):
    return round((mah * 3.7) / 1000.0, 2)

existing = load_existing_ids()
devices = []

def uid(base):
    if base not in existing:
        existing.add(base)
        return base
    n = 2
    while f"{base}-{n}" in existing:
        n += 1
    i = f"{base}-{n}"
    existing.add(i)
    return i

def add(d):
    d = dict(d)
    d.setdefault('efficiency', 0.85)
    d.setdefault('rechargeable', True)
    d.setdefault('source', 'manual')
    d.setdefault('confidence', 'medium')
    d['id'] = uid(d['id'])
    if d.get('batteryWh', 0) <= 0 or d.get('chargeWatts', 0) <= 0:
        raise ValueError(d)
    devices.append(d)

# ---------- PHONES ----------
samsung = [
    ("samsung-galaxy-a02","Samsung","Galaxy A02",5000,7.75,"high"),
    ("samsung-galaxy-a02s","Samsung","Galaxy A02s",5000,15,"high"),
    ("samsung-galaxy-a03s","Samsung","Galaxy A03s",5000,15,"high"),
    ("samsung-galaxy-a10e","Samsung","Galaxy A10e",3000,5,"high"),
    ("samsung-galaxy-a20e","Samsung","Galaxy A20e",3000,15,"high"),
    ("samsung-galaxy-a20s","Samsung","Galaxy A20s",4000,15,"high"),
    ("samsung-galaxy-a21","Samsung","Galaxy A21",4000,15,"high"),
    ("samsung-galaxy-a30s","Samsung","Galaxy A30s",4000,15,"high"),
    ("samsung-galaxy-a31-128","Samsung","Galaxy A31 128GB",5000,15,"high"),
    ("samsung-galaxy-a32-5g","Samsung","Galaxy A32 5G",5000,15,"high"),
    ("samsung-galaxy-a40","Samsung","Galaxy A40",3100,15,"high"),
    ("samsung-galaxy-a41","Samsung","Galaxy A41",3500,15,"high"),
    ("samsung-galaxy-a42-5g","Samsung","Galaxy A42 5G",5000,15,"high"),
    ("samsung-galaxy-a52s-5g","Samsung","Galaxy A52s 5G",4500,25,"high"),
    ("samsung-galaxy-a70","Samsung","Galaxy A70",4500,25,"high"),
    ("samsung-galaxy-a71","Samsung","Galaxy A71",4500,25,"high"),
    ("samsung-galaxy-a72","Samsung","Galaxy A72",5000,25,"high"),
    ("samsung-galaxy-a73-5g","Samsung","Galaxy A73 5G",5000,25,"high"),
    ("samsung-galaxy-a90-5g","Samsung","Galaxy A90 5G",4500,25,"high"),
    ("samsung-galaxy-m01","Samsung","Galaxy M01",4000,5,"high"),
    ("samsung-galaxy-m02","Samsung","Galaxy M02",5000,7.75,"high"),
    ("samsung-galaxy-m02s","Samsung","Galaxy M02s",5000,15,"high"),
    ("samsung-galaxy-m04","Samsung","Galaxy M04",5000,15,"high"),
    ("samsung-galaxy-m11","Samsung","Galaxy M11",5000,15,"high"),
    ("samsung-galaxy-m12","Samsung","Galaxy M12",6000,15,"high"),
    ("samsung-galaxy-m13","Samsung","Galaxy M13",5000,15,"high"),
    ("samsung-galaxy-m13-5g","Samsung","Galaxy M13 5G",5000,15,"high"),
    ("samsung-galaxy-m14-5g","Samsung","Galaxy M14 5G",6000,25,"high"),
    ("samsung-galaxy-m14-4g","Samsung","Galaxy M14 4G",5000,25,"high"),
    ("samsung-galaxy-m20","Samsung","Galaxy M20",5000,15,"high"),
    ("samsung-galaxy-m21","Samsung","Galaxy M21",6000,15,"high"),
    ("samsung-galaxy-m22","Samsung","Galaxy M22",5000,25,"high"),
    ("samsung-galaxy-m23-5g","Samsung","Galaxy M23 5G",5000,25,"high"),
    ("samsung-galaxy-m30","Samsung","Galaxy M30",5000,15,"high"),
    ("samsung-galaxy-m30s","Samsung","Galaxy M30s",6000,15,"high"),
    ("samsung-galaxy-m31","Samsung","Galaxy M31",6000,15,"high"),
    ("samsung-galaxy-m31s","Samsung","Galaxy M31s",6000,25,"high"),
    ("samsung-galaxy-m32","Samsung","Galaxy M32",6000,25,"high"),
    ("samsung-galaxy-m33-5g","Samsung","Galaxy M33 5G",6000,25,"high"),
    ("samsung-galaxy-m34-5g","Samsung","Galaxy M34 5G",6000,25,"high"),
    ("samsung-galaxy-m35-5g","Samsung","Galaxy M35 5G",6000,25,"high"),
    ("samsung-galaxy-m51","Samsung","Galaxy M51",7000,25,"high"),
    ("samsung-galaxy-m52-5g","Samsung","Galaxy M52 5G",5000,25,"high"),
    ("samsung-galaxy-m53-5g","Samsung","Galaxy M53 5G",5000,25,"high"),
    ("samsung-galaxy-m54-5g","Samsung","Galaxy M54 5G",6000,25,"high"),
    ("samsung-galaxy-m55-5g","Samsung","Galaxy M55 5G",5000,45,"high"),
    ("samsung-galaxy-f04","Samsung","Galaxy F04",5000,15,"high"),
    ("samsung-galaxy-f13","Samsung","Galaxy F13",6000,15,"high"),
    ("samsung-galaxy-f14-5g","Samsung","Galaxy F14 5G",6000,25,"high"),
    ("samsung-galaxy-f23-5g","Samsung","Galaxy F23 5G",5000,25,"high"),
    ("samsung-galaxy-f34-5g","Samsung","Galaxy F34 5G",6000,25,"high"),
    ("samsung-galaxy-f54-5g","Samsung","Galaxy F54 5G",6000,25,"high"),
    ("samsung-galaxy-s7","Samsung","Galaxy S7",3000,15,"high"),
    ("samsung-galaxy-s7-edge","Samsung","Galaxy S7 Edge",3600,15,"high"),
    ("samsung-galaxy-s8","Samsung","Galaxy S8",3000,15,"high"),
    ("samsung-galaxy-s8-plus","Samsung","Galaxy S8+",3500,15,"high"),
    ("samsung-galaxy-s9","Samsung","Galaxy S9",3000,15,"high"),
    ("samsung-galaxy-s9-plus","Samsung","Galaxy S9+",3500,15,"high"),
    ("samsung-galaxy-s10","Samsung","Galaxy S10",3400,15,"high"),
    ("samsung-galaxy-s10-plus","Samsung","Galaxy S10+",4100,15,"high"),
    ("samsung-galaxy-s10e","Samsung","Galaxy S10e",3100,15,"high"),
    ("samsung-galaxy-s20","Samsung","Galaxy S20",4000,25,"high"),
    ("samsung-galaxy-s20-plus","Samsung","Galaxy S20+",4500,25,"high"),
    ("samsung-galaxy-s20-ultra","Samsung","Galaxy S20 Ultra",5000,45,"high"),
    ("samsung-galaxy-s21-plus","Samsung","Galaxy S21+",4800,25,"high"),
    ("samsung-galaxy-s21-ultra","Samsung","Galaxy S21 Ultra",5000,25,"high"),
    ("samsung-galaxy-s21-fe-5g","Samsung","Galaxy S21 FE 5G",4500,25,"high"),
    ("samsung-galaxy-s22-plus","Samsung","Galaxy S22+",4500,45,"high"),
    ("samsung-galaxy-s22-ultra","Samsung","Galaxy S22 Ultra",5000,45,"high"),
    ("samsung-galaxy-s23-fe","Samsung","Galaxy S23 FE",4500,25,"high"),
    ("samsung-galaxy-s23-plus","Samsung","Galaxy S23+",4700,45,"high"),
    ("samsung-galaxy-s23-ultra","Samsung","Galaxy S23 Ultra",5000,45,"high"),
    ("samsung-galaxy-s24","Samsung","Galaxy S24",4000,25,"high"),
    ("samsung-galaxy-s24-plus","Samsung","Galaxy S24+",4900,45,"high"),
    ("samsung-galaxy-s24-ultra","Samsung","Galaxy S24 Ultra",5000,45,"high"),
    ("samsung-galaxy-note8","Samsung","Galaxy Note8",3300,15,"high"),
    ("samsung-galaxy-note9","Samsung","Galaxy Note9",4000,15,"high"),
    ("samsung-galaxy-note10","Samsung","Galaxy Note10",3500,25,"high"),
    ("samsung-galaxy-note10-plus","Samsung","Galaxy Note10+",4300,45,"high"),
    ("samsung-galaxy-note20","Samsung","Galaxy Note20",4300,25,"high"),
    ("samsung-galaxy-note20-ultra","Samsung","Galaxy Note20 Ultra",4500,25,"high"),
]
for id_, brand, model, mah, w, conf in samsung:
    add({"id":id_,"category":"phone","brand":brand,"model":model,"batteryWh":mah_to_wh(mah),"chargeWatts":w,"confidence":conf})

xiaomi = [
    ("xiaomi-redmi-6a","Xiaomi","Redmi 6A",3000,10,"high"),("xiaomi-redmi-7","Xiaomi","Redmi 7",4000,10,"high"),
    ("xiaomi-redmi-7a","Xiaomi","Redmi 7A",4000,10,"high"),("xiaomi-redmi-8","Xiaomi","Redmi 8",5000,18,"high"),
    ("xiaomi-redmi-8a","Xiaomi","Redmi 8A",5000,18,"high"),("xiaomi-redmi-9","Xiaomi","Redmi 9",5020,18,"high"),
    ("xiaomi-redmi-9-prime","Xiaomi","Redmi 9 Prime",5020,18,"high"),("xiaomi-redmi-9t","Xiaomi","Redmi 9T",6000,18,"high"),
    ("xiaomi-redmi-10","Xiaomi","Redmi 10",5000,18,"high"),("xiaomi-redmi-10-2022","Xiaomi","Redmi 10 2022",5000,18,"high"),
    ("xiaomi-redmi-10-prime","Xiaomi","Redmi 10 Prime",6000,18,"high"),("xiaomi-redmi-11-prime","Xiaomi","Redmi 11 Prime",5000,18,"high"),
    ("xiaomi-redmi-12","Xiaomi","Redmi 12",5000,18,"high"),("xiaomi-redmi-12-5g","Xiaomi","Redmi 12 5G",5000,18,"high"),
    ("xiaomi-redmi-13","Xiaomi","Redmi 13",5030,33,"high"),("xiaomi-redmi-13-5g","Xiaomi","Redmi 13 5G",5030,33,"high"),
    ("xiaomi-redmi-note-7","Xiaomi","Redmi Note 7",4000,18,"high"),("xiaomi-redmi-note-8-pro","Xiaomi","Redmi Note 8 Pro",4500,18,"high"),
    ("xiaomi-redmi-note-8t","Xiaomi","Redmi Note 8T",4000,18,"high"),("xiaomi-redmi-note-9-pro","Xiaomi","Redmi Note 9 Pro",5020,30,"high"),
    ("xiaomi-redmi-note-9s","Xiaomi","Redmi Note 9S",5020,18,"high"),("xiaomi-redmi-note-10s","Xiaomi","Redmi Note 10S",5000,33,"high"),
    ("xiaomi-redmi-note-10-pro","Xiaomi","Redmi Note 10 Pro",5020,33,"high"),("xiaomi-redmi-note-10-5g","Xiaomi","Redmi Note 10 5G",5000,18,"high"),
    ("xiaomi-redmi-note-11s","Xiaomi","Redmi Note 11S",5000,33,"high"),("xiaomi-redmi-note-11-pro","Xiaomi","Redmi Note 11 Pro",5000,67,"high"),
    ("xiaomi-redmi-note-11-pro-5g","Xiaomi","Redmi Note 11 Pro 5G",5000,67,"high"),("xiaomi-redmi-note-12s","Xiaomi","Redmi Note 12S",5000,33,"high"),
    ("xiaomi-redmi-note-12-pro","Xiaomi","Redmi Note 12 Pro",5000,67,"high"),("xiaomi-redmi-note-12-pro-5g","Xiaomi","Redmi Note 12 Pro 5G",5000,67,"high"),
    ("xiaomi-redmi-note-13-5g","Xiaomi","Redmi Note 13 5G",5000,33,"high"),("xiaomi-redmi-note-13-pro-plus","Xiaomi","Redmi Note 13 Pro+",5000,120,"high"),
    ("xiaomi-redmi-note-14","Xiaomi","Redmi Note 14",5500,33,"medium"),("xiaomi-redmi-note-14-pro","Xiaomi","Redmi Note 14 Pro",5500,45,"medium"),
    ("xiaomi-poco-c3","Xiaomi","POCO C3",5000,10,"high"),("xiaomi-poco-c31","Xiaomi","POCO C31",5000,10,"high"),
    ("xiaomi-poco-c50","Xiaomi","POCO C50",5000,10,"high"),("xiaomi-poco-c51","Xiaomi","POCO C51",5000,10,"high"),
    ("xiaomi-poco-c55","Xiaomi","POCO C55",5000,10,"high"),("xiaomi-poco-c61","Xiaomi","POCO C61",5000,10,"high"),
    ("xiaomi-poco-c65","Xiaomi","POCO C65",5000,18,"high"),("xiaomi-poco-m2","Xiaomi","POCO M2",5000,18,"high"),
    ("xiaomi-poco-m3-pro","Xiaomi","POCO M3 Pro 5G",5000,18,"high"),("xiaomi-poco-m4-pro","Xiaomi","POCO M4 Pro",5000,33,"high"),
    ("xiaomi-poco-m4-5g","Xiaomi","POCO M4 5G",5000,18,"high"),("xiaomi-poco-m5s","Xiaomi","POCO M5s",5000,33,"high"),
    ("xiaomi-poco-m6","Xiaomi","POCO M6",5030,33,"high"),("xiaomi-poco-m6-pro","Xiaomi","POCO M6 Pro",5000,67,"high"),
    ("xiaomi-poco-x3-pro","Xiaomi","POCO X3 Pro",5160,33,"high"),("xiaomi-poco-x4-pro","Xiaomi","POCO X4 Pro 5G",5000,67,"high"),
    ("xiaomi-poco-x5","Xiaomi","POCO X5 5G",5000,33,"high"),("xiaomi-poco-x5-pro","Xiaomi","POCO X5 Pro 5G",5000,67,"high"),
    ("xiaomi-poco-x6","Xiaomi","POCO X6 5G",5100,67,"high"),("xiaomi-poco-f3","Xiaomi","POCO F3",4520,33,"high"),
    ("xiaomi-poco-f4","Xiaomi","POCO F4",4500,67,"high"),("xiaomi-poco-f5","Xiaomi","POCO F5",5000,67,"high"),
    ("xiaomi-mi-a2","Xiaomi","Mi A2",3000,10,"high"),("xiaomi-mi-a3","Xiaomi","Mi A3",4030,18,"high"),
    ("xiaomi-mi-9t","Xiaomi","Mi 9T",4000,18,"high"),("xiaomi-mi-10t","Xiaomi","Mi 10T",5000,33,"high"),
    ("xiaomi-mi-11-lite","Xiaomi","Mi 11 Lite",4250,33,"high"),
]
for id_, brand, model, mah, w, conf in xiaomi:
    add({"id":id_,"category":"phone","brand":brand,"model":model,"batteryWh":mah_to_wh(mah),"chargeWatts":w,"confidence":conf})

tecno_infinix_itel = [
    ("tecno-pop-4","Tecno","Pop 4",5000,10),("tecno-pop-4-pro","Tecno","Pop 4 Pro",5000,10),
    ("tecno-pop-5-lte","Tecno","Pop 5 LTE",5000,10),("tecno-pop-5-pro","Tecno","Pop 5 Pro",6000,10),
    ("tecno-pop-6","Tecno","Pop 6",5000,10),("tecno-pop-6-pro","Tecno","Pop 6 Pro",5000,10),
    ("tecno-pop-7-pro","Tecno","Pop 7 Pro",5000,10),("tecno-pop-8","Tecno","Pop 8",5000,10),
    ("tecno-spark-6-go","Tecno","Spark 6 Go",5000,10),("tecno-spark-7","Tecno","Spark 7",6000,10),
    ("tecno-spark-8","Tecno","Spark 8",5000,10),("tecno-spark-8p","Tecno","Spark 8P",5000,18),
    ("tecno-spark-9t","Tecno","Spark 9T",5000,18),("tecno-spark-10c","Tecno","Spark 10C",5000,18),
    ("tecno-spark-20c","Tecno","Spark 20C",5000,18),("tecno-spark-go-2022","Tecno","Spark Go 2022",5000,10),
    ("tecno-spark-go-2024","Tecno","Spark Go 2024",5000,10),("tecno-camon-16","Tecno","Camon 16",5000,18),
    ("tecno-camon-17","Tecno","Camon 17",5000,18),("tecno-camon-18","Tecno","Camon 18",5000,18),
    ("tecno-camon-30","Tecno","Camon 30",5000,70),("tecno-pova-3","Tecno","Pova 3",7000,25),
    ("tecno-pova-4","Tecno","Pova 4",6000,18),("tecno-pova-5","Tecno","Pova 5",6000,45),
    ("tecno-pova-6","Tecno","Pova 6",6000,70),
    ("infinix-smart-5","Infinix","Smart 5",5000,10),("infinix-smart-6","Infinix","Smart 6",5000,10),
    ("infinix-smart-7","Infinix","Smart 7",5000,10),("infinix-smart-8","Infinix","Smart 8",5000,10),
    ("infinix-hot-10","Infinix","Hot 10",5200,10),("infinix-hot-10-play","Infinix","Hot 10 Play",6000,10),
    ("infinix-hot-11-play","Infinix","Hot 11 Play",6000,10),("infinix-hot-12-play","Infinix","Hot 12 Play",6000,10),
    ("infinix-hot-20","Infinix","Hot 20",5000,18),("infinix-hot-30","Infinix","Hot 30",5000,33),
    ("infinix-hot-30i","Infinix","Hot 30i",5000,18),("infinix-hot-30-play","Infinix","Hot 30 Play",6000,18),
    ("infinix-hot-40","Infinix","Hot 40",5000,33),("infinix-hot-40i","Infinix","Hot 40i",5000,18),
    ("infinix-note-12","Infinix","Note 12",5000,33),("infinix-note-30","Infinix","Note 30",5000,45),
    ("infinix-note-40","Infinix","Note 40",5000,45),
    ("itel-a50","Itel","A50",5000,10),("itel-a60","Itel","A60",5000,10),
    ("itel-a60s","Itel","A60s",5000,10),("itel-a70","Itel","A70",5000,10),
    ("itel-p36","Itel","P36",5000,10),("itel-p37","Itel","P37",5000,10),
    ("itel-p38","Itel","P38",5000,15),("itel-p40","Itel","P40",6000,18),
    ("itel-p55","Itel","P55",5000,18),("itel-s23","Itel","S23",5000,10),
    ("itel-vision-2","Itel","Vision 2",4000,10),("itel-vision-3","Itel","Vision 3",5000,18),
]
for id_, brand, model, mah, w in tecno_infinix_itel:
    add({"id":id_,"category":"phone","brand":brand,"model":model,"batteryWh":mah_to_wh(mah),"chargeWatts":w,"confidence":"high" if brand!="Itel" else "medium"})

other_brands = [
    ("huawei-y5-2019","Huawei","Y5 2019",3020,10),("huawei-y6-2019","Huawei","Y6 2019",3020,10),
    ("huawei-y7-2019","Huawei","Y7 2019",4000,10),("huawei-y7a","Huawei","Y7a",5000,22.5),
    ("huawei-y8p","Huawei","Y8p",4000,10),("huawei-y9-2019","Huawei","Y9 2019",4000,10),
    ("huawei-y9a","Huawei","Y9a",4300,40),("huawei-p20-lite","Huawei","P20 lite",3000,18),
    ("huawei-p30","Huawei","P30",3650,22.5),("huawei-p30-pro","Huawei","P30 Pro",4200,40),
    ("huawei-p40-lite","Huawei","P40 lite",4200,40),("huawei-nova-5t","Huawei","nova 5T",3750,22.5),
    ("huawei-nova-7i","Huawei","nova 7i",4200,40),("huawei-nova-8i","Huawei","nova 8i",4300,66),
    ("huawei-nova-y60","Huawei","nova Y60",5000,10),("huawei-nova-y70-plus","Huawei","nova Y70 Plus",6000,22.5),
    ("huawei-nova-y91","Huawei","nova Y91",7000,22.5),
    ("honor-x5","Honor","X5",5000,10),("honor-x6","Honor","X6",5000,10),
    ("honor-x6a","Honor","X6a",5200,22.5),("honor-x7","Honor","X7",5000,22.5),
    ("honor-x7a","Honor","X7a",6000,22.5),("honor-x7b","Honor","X7b",6000,35),
    ("honor-x8","Honor","X8",4000,22.5),("honor-x8b","Honor","X8b",4500,35),
    ("honor-9x","Honor","9X",4000,10),("honor-90-lite","Honor","90 Lite",4500,22.5),
    ("motorola-moto-e6","Motorola","Moto E6",3000,5),("motorola-moto-e7","Motorola","Moto E7",4000,10),
    ("motorola-moto-e7-plus","Motorola","Moto E7 Plus",5000,10),("motorola-moto-e22","Motorola","Moto E22",4020,10),
    ("motorola-moto-e32","Motorola","Moto E32",5000,18),("motorola-moto-g7","Motorola","Moto G7",3000,15),
    ("motorola-moto-g7-power","Motorola","Moto G7 Power",5000,15),("motorola-moto-g8","Motorola","Moto G8",4000,10),
    ("motorola-moto-g8-power","Motorola","Moto G8 Power",5000,18),("motorola-moto-g9-play","Motorola","Moto G9 Play",5000,20),
    ("motorola-moto-g9-power","Motorola","Moto G9 Power",6000,20),("motorola-moto-g10","Motorola","Moto G10",5000,10),
    ("motorola-moto-g20","Motorola","Moto G20",5000,10),("motorola-moto-g30","Motorola","Moto G30",5000,20),
    ("motorola-moto-g31","Motorola","Moto G31",5000,10),("motorola-moto-g41","Motorola","Moto G41",5000,30),
    ("motorola-moto-g42","Motorola","Moto G42",5000,20),("motorola-moto-g52","Motorola","Moto G52",5000,30),
    ("motorola-moto-g72","Motorola","Moto G72",5000,33),("motorola-moto-g73-5g","Motorola","Moto G73 5G",5000,30),
    ("motorola-moto-g84-5g","Motorola","Moto G84 5G",5000,30),("motorola-edge-30","Motorola","Edge 30",4020,33),
    ("nokia-c12","Nokia","C12",3000,10),("nokia-c20","Nokia","C20",3000,10),
    ("nokia-c21","Nokia","C21",3000,10),("nokia-c22","Nokia","C22",5000,10),
    ("nokia-c30","Nokia","C30",6000,10),("nokia-c32","Nokia","C32",5000,10),
    ("nokia-g10","Nokia","G10",5050,10),("nokia-g20","Nokia","G20",5050,10),
    ("nokia-g21","Nokia","G21",5050,18),("nokia-g22","Nokia","G22",5050,20),
    ("oppo-a12","Oppo","A12",4230,10),("oppo-a15","Oppo","A15",4230,10),
    ("oppo-a16","Oppo","A16",5000,10),("oppo-a17","Oppo","A17",5000,10),
    ("oppo-a18","Oppo","A18",5000,10),("oppo-a38","Oppo","A38",5000,33),
    ("oppo-a54","Oppo","A54",5000,18),("oppo-a57-2022","Oppo","A57 2022",5000,33),
    ("oppo-a58","Oppo","A58",5000,33),("oppo-a78","Oppo","A78",5000,67),
    ("vivo-y02","Vivo","Y02",5000,10),("vivo-y15s","Vivo","Y15s",5000,10),
    ("vivo-y16","Vivo","Y16",5000,10),("vivo-y17s","Vivo","Y17s",5000,15),
    ("vivo-y20","Vivo","Y20",5000,18),("vivo-y21","Vivo","Y21",5000,18),
    ("vivo-y22","Vivo","Y22",5000,18),("vivo-y27","Vivo","Y27",5000,44),
    ("vivo-y35","Vivo","Y35",5000,44),("vivo-y36","Vivo","Y36",5000,44),
    ("realme-c11-2021","Realme","C11 2021",5000,10),("realme-c15","Realme","C15",6000,18),
    ("realme-c21","Realme","C21",5000,10),("realme-c25s","Realme","C25s",6000,18),
    ("realme-c31","Realme","C31",5000,10),("realme-c33","Realme","C33",5000,10),
    ("realme-c35","Realme","C35",5000,18),("realme-c51","Realme","C51",5000,33),
    ("realme-c53","Realme","C53",5000,33),("realme-c55","Realme","C55",5000,33),
    ("realme-c67","Realme","C67",5000,33),("realme-narzo-50a","Realme","Narzo 50A",6000,18),
    ("realme-note-50","Realme","Note 50",5000,10),
    ("zte-blade-a31","ZTE","Blade A31",3000,10),("zte-blade-a51","ZTE","Blade A51",4000,10),
    ("zte-blade-a52","ZTE","Blade A52",4000,10),("zte-blade-a71","ZTE","Blade A71",4000,10),
    ("zte-blade-v30","ZTE","Blade V30",5000,18),("zte-blade-v40","ZTE","Blade V40",6000,22.5),
    ("alcatel-1s-2021","Alcatel","1S (2021)",4010,10),("alcatel-1v-2020","Alcatel","1V (2020)",4000,10),
    ("alcatel-3x-2020","Alcatel","3X (2020)",5000,10),
    ("lg-k22","LG","K22",3000,10),("lg-k41s","LG","K41S",4000,10),
    ("lg-k51","LG","K51",4000,10),("lg-k52","LG","K52",4000,10),
    ("lg-k61","LG","K61",4000,10),
]
for id_, brand, model, mah, w in other_brands:
    add({"id":id_,"category":"phone","brand":brand,"model":model,"batteryWh":mah_to_wh(mah),"chargeWatts":w,"confidence":"high" if brand in ("Huawei","Honor","Motorola","Nokia","Oppo","Vivo","Realme") else "medium"})

iphones = [
    ("apple-iphone-6s","Apple","iPhone 6s",6.55,10),("apple-iphone-7","Apple","iPhone 7",7.45,10),
    ("apple-iphone-7-plus","Apple","iPhone 7 Plus",11.1,10),("apple-iphone-8","Apple","iPhone 8",6.96,12),
    ("apple-iphone-8-plus","Apple","iPhone 8 Plus",10.28,12),("apple-iphone-x","Apple","iPhone X",10.35,15),
    ("apple-iphone-xs","Apple","iPhone XS",10.13,15),("apple-iphone-xs-max","Apple","iPhone XS Max",12.08,15),
    ("apple-iphone-xr","Apple","iPhone XR",11.16,15),("apple-iphone-11","Apple","iPhone 11",11.91,18),
    ("apple-iphone-11-pro","Apple","iPhone 11 Pro",11.67,18),("apple-iphone-11-pro-max","Apple","iPhone 11 Pro Max",15.04,18),
    ("apple-iphone-12","Apple","iPhone 12",10.78,20),("apple-iphone-12-mini","Apple","iPhone 12 mini",8.57,20),
    ("apple-iphone-12-pro","Apple","iPhone 12 Pro",10.78,20),("apple-iphone-12-pro-max","Apple","iPhone 12 Pro Max",14.13,20),
    ("apple-iphone-13","Apple","iPhone 13",12.41,20),("apple-iphone-13-mini","Apple","iPhone 13 mini",9.34,20),
    ("apple-iphone-13-pro","Apple","iPhone 13 Pro",11.97,20),("apple-iphone-13-pro-max","Apple","iPhone 13 Pro Max",16.75,20),
    ("apple-iphone-14","Apple","iPhone 14",12.68,20),("apple-iphone-14-plus","Apple","iPhone 14 Plus",16.68,20),
    ("apple-iphone-14-pro","Apple","iPhone 14 Pro",12.38,20),("apple-iphone-14-pro-max","Apple","iPhone 14 Pro Max",16.68,20),
    ("apple-iphone-15","Apple","iPhone 15",12.70,20),("apple-iphone-15-plus","Apple","iPhone 15 Plus",16.95,20),
    ("apple-iphone-15-pro","Apple","iPhone 15 Pro",12.70,20),("apple-iphone-15-pro-max","Apple","iPhone 15 Pro Max",17.11,20),
    ("apple-iphone-se-2020","Apple","iPhone SE (2020)",6.96,18),("apple-iphone-se-2022","Apple","iPhone SE (2022)",7.82,20),
]
for id_, brand, model, wh, w in iphones:
    add({"id":id_,"category":"phone","brand":brand,"model":model,"batteryWh":wh,"chargeWatts":w,"confidence":"high"})

# ---------- TABLETS ----------
tabs = [
    ("samsung-galaxy-tab-a-8-2019","Samsung","Galaxy Tab A 8.0 (2019)",19.24,10),("samsung-galaxy-tab-a-10-1-2019","Samsung","Galaxy Tab A 10.1 (2019)",23.43,10),
    ("samsung-galaxy-tab-a7","Samsung","Galaxy Tab A7 10.4",26.34,15),("samsung-galaxy-tab-s5e","Samsung","Galaxy Tab S5e",26.34,18),
    ("samsung-galaxy-tab-s6","Samsung","Galaxy Tab S6",26.34,15),("samsung-galaxy-tab-s6-lite-2022","Samsung","Galaxy Tab S6 Lite (2022)",26.34,15),
    ("samsung-galaxy-tab-s7","Samsung","Galaxy Tab S7",30.74,45),("samsung-galaxy-tab-s7-plus","Samsung","Galaxy Tab S7+",38.7,45),
    ("samsung-galaxy-tab-s8","Samsung","Galaxy Tab S8",30.74,45),("samsung-galaxy-tab-s8-plus","Samsung","Galaxy Tab S8+",37.0,45),
    ("samsung-galaxy-tab-s9","Samsung","Galaxy Tab S9",31.18,45),("samsung-galaxy-tab-active3","Samsung","Galaxy Tab Active3",19.04,15),
    ("xiaomi-mi-pad-4","Xiaomi","Mi Pad 4",22.8,10),("xiaomi-mi-pad-5","Xiaomi","Pad 5",33.13,33),
    ("xiaomi-pad-6-pro","Xiaomi","Pad 6 Pro",33.16,67),("xiaomi-redmi-pad-pro","Xiaomi","Redmi Pad Pro",37.96,33),
    ("huawei-mediapad-t3-10","Huawei","MediaPad T3 10",18.24,10),("huawei-mediapad-t5","Huawei","MediaPad T5 10",19.24,10),
    ("huawei-matepad-10-4","Huawei","MatePad 10.4",27.74,22.5),("huawei-matepad-11-2023","Huawei","MatePad 11 (2023)",27.74,22.5),
    ("lenovo-tab-m7","Lenovo","Tab M7",13.32,10),("lenovo-tab-m8-hd","Lenovo","Tab M8 HD",19.24,10),
    ("lenovo-tab-m10-hd","Lenovo","Tab M10 HD",18.5,10),("lenovo-tab-p11-plus","Lenovo","Tab P11 Plus",28.5,20),
    ("lenovo-tab-p12","Lenovo","Tab P12",38.72,30),("lenovo-yoga-tab-11","Lenovo","Yoga Tab 11",28.5,20),
    ("apple-ipad-9","Apple","iPad (9ª gen)",32.4,20),("apple-ipad-10","Apple","iPad (10ª gen)",28.6,20),
    ("apple-ipad-air-5","Apple","iPad Air (5ª gen)",28.6,20),("apple-ipad-mini-6","Apple","iPad mini (6ª gen)",19.3,20),
    ("amazon-fire-7-2022","Amazon","Fire 7 (2022)",11.1,5),("amazon-fire-max-11","Amazon","Fire Max 11",28.16,15),
    ("alcatel-1t-10","Alcatel","1T 10",15.17,10),("alcatel-3t-10","Alcatel","3T 10",20.72,10),
    ("tcl-tab-8","TCL","Tab 8",15.17,10),("tcl-tab-10","TCL","Tab 10",29.97,18),
    ("blackview-tab-7","Blackview","Tab 7",20.72,10),("blackview-tab-11","Blackview","Tab 11",31.45,18),
    ("teclast-p30s","Teclast","P30S",22.2,10),("teclast-m40","Teclast","M40",22.2,18),
    ("chuwi-hi10-go","Chuwi","Hi10 Go",26.6,24),("onn-surf-8-pro","Onn","Surf Tablet Pro 8\"",20.72,10),
    ("onn-surf-11-pro","Onn","Surf Tablet Pro 11\"",29.97,18),
]
for id_, brand, model, wh, w in tabs:
    conf = "high" if brand in ("Samsung","Xiaomi","Huawei","Lenovo","Apple","Amazon") else "medium"
    add({"id":id_,"category":"tablet","brand":brand,"model":model,"batteryWh":wh,"chargeWatts":w,"confidence":conf})

# ---------- POWERBANKS ----------
for mah in [5000,6000,10000,12000,15000,20000,25000,26800,30000,40000]:
    for w in [10,18,20,22.5,30,45]:
        if mah <= 6000 and w > 20: continue
        if mah <= 10000 and w > 30: continue
        if mah >= 30000 and w < 18: continue
        if w >= 45 and mah < 20000: continue
        cap = f"{mah//1000}.000 mAh" if mah%1000==0 else f"{mah} mAh"
        add({"id":f"powerbank-generic-{mah}mah-{str(w).replace('.','-')}w","category":"powerbank","brand":"Genérico","model":f"Power Bank {cap} {w}W","batteryWh":mah_to_wh(mah),"chargeWatts":w})

brand_pbs = [
    ("anker-323-10000","Anker","323 Power Bank 10.000 mAh 12W",37,12,"high"),("anker-525-20000","Anker","525 PowerCore 20.000 mAh",72,20,"high"),
    ("anker-537-24000","Anker","537 Power Bank 24.000 mAh 65W",89.9,65,"high"),("anker-347-40000","Anker","347 Power Bank 40.000 mAh 30W",148,30,"high"),
    ("anker-prime-20000","Anker","Prime 20.000 mAh 200W",72,100,"high"),
    ("xiaomi-33w-10000","Xiaomi","Power Bank 33W 10.000 mAh",37,33,"high"),("xiaomi-33w-20000","Xiaomi","Power Bank 33W 20.000 mAh",74,33,"high"),
    ("xiaomi-50w-20000","Xiaomi","Power Bank 50W 20.000 mAh",74,50,"high"),("xiaomi-redmi-10000-fast","Xiaomi","Redmi Power Bank 10.000 mAh 22.5W",37,22.5,"high"),
    ("baseus-bipow-pro-10000","Baseus","Bipow Pro 10.000 mAh 20W",37,20,"medium"),("baseus-bipow-pro-20000","Baseus","Bipow Pro 20.000 mAh 22.5W",74,22.5,"medium"),
    ("baseus-blade-20000","Baseus","Blade 20.000 mAh 100W",74,100,"medium"),
    ("ugreen-nexode-10000-30w","Ugreen","Nexode 10.000 mAh 30W",37,30,"medium"),("ugreen-nexode-20000-45w","Ugreen","Nexode 20.000 mAh 45W",74,45,"medium"),
    ("romoss-sense8p-30000","Romoss","Sense8P+ 30.000 mAh 18W",111,18,"medium"),("romoss-pea40-40000","Romoss","PEA40 40.000 mAh 18W",148,18,"medium"),
    ("oraimo-toast-10-10000","Oraimo","Toast 10 PD 10.000 mAh",37,20,"medium"),("oraimo-pilot-20000-22w","Oraimo","Pilot 20.000 mAh 22.5W",74,22.5,"medium"),
    ("havit-pb90-10000","Havit","PB90 10.000 mAh 20W",37,20,"medium"),("havit-pb92-20000","Havit","PB92 20.000 mAh 22.5W",74,22.5,"medium"),
    ("belkin-10000-15w","Belkin","BoostCharge 10.000 mAh 15W",37,15,"high"),("belkin-20000-30w","Belkin","BoostCharge 20.000 mAh 30W",74,30,"high"),
    ("iniu-10000-22w","INIU","Power Bank 10.000 mAh 22.5W",37,22.5,"medium"),("iniu-20000-22w","INIU","Power Bank 20.000 mAh 22.5W",74,22.5,"medium"),
    ("joyroom-qp191-10000","Joyroom","JR-QP191 10.000 mAh 22.5W",37,22.5,"medium"),("joyroom-qp192-20000","Joyroom","JR-QP192 20.000 mAh 22.5W",74,22.5,"medium"),
]
for id_, brand, model, wh, w, conf in brand_pbs:
    add({"id":id_,"category":"powerbank","brand":brand,"model":model,"batteryWh":wh,"chargeWatts":w,"confidence":conf})

# ---------- LAPTOPS ----------
laptops = [
    ("hp-250-g9","HP","250 G9 (41 Wh)",41,45),("hp-255-g9","HP","255 G9 (41 Wh)",41,45),
    ("hp-15s-fq","HP","15s-fq (41 Wh)",41,45),("hp-15s-eq","HP","15s-eq (41 Wh)",41,45),
    ("hp-victus-15","HP","Victus 15 (52.5 Wh)",52.5,135),("hp-envy-13","HP","Envy 13 (51 Wh)",51,65),
    ("hp-envy-x360-15","HP","Envy x360 15 (55.67 Wh)",55.67,65),("hp-probook-450-g9","HP","ProBook 450 G9 (51 Wh)",51,65),
    ("hp-elitebook-830-g8","HP","EliteBook 830 G8 (53 Wh)",53,65),("hp-omen-16","HP","OMEN 16 (70 Wh)",70,230),
    ("dell-vostro-3510","Dell","Vostro 15 3510 (41 Wh)",41,65),("dell-vostro-3520","Dell","Vostro 15 3520 (41 Wh)",41,65),
    ("dell-inspiron-14-5420","Dell","Inspiron 14 5420 (54 Wh)",54,65),("dell-inspiron-16-5620","Dell","Inspiron 16 5620 (54 Wh)",54,65),
    ("dell-xps-13-9315","Dell","XPS 13 9315 (51 Wh)",51,45),("dell-xps-15-9520","Dell","XPS 15 9520 (86 Wh)",86,130),
    ("dell-latitude-3520","Dell","Latitude 3520 (54 Wh)",54,65),("dell-g15-5520","Dell","G15 5520 (56 Wh)",56,180),
    ("lenovo-v14-g3","Lenovo","V14 G3 (38 Wh)",38,45),("lenovo-v15-g3","Lenovo","V15 G3 (38 Wh)",38,45),
    ("lenovo-ideapad-1-15","Lenovo","IdeaPad 1 15 (42 Wh)",42,45),("lenovo-ideapad-slim-3-15","Lenovo","IdeaPad Slim 3 15 (47 Wh)",47,65),
    ("lenovo-ideapad-gaming-3-15","Lenovo","IdeaPad Gaming 3 15 (45 Wh)",45,135),("lenovo-legion-5-15","Lenovo","Legion 5 15 (60 Wh)",60,170),
    ("lenovo-thinkbook-15-g4","Lenovo","ThinkBook 15 G4 (45 Wh)",45,65),("lenovo-thinkpad-l14-g3","Lenovo","ThinkPad L14 Gen 3 (42 Wh)",42,65),
    ("lenovo-yoga-slim-7-14","Lenovo","Yoga Slim 7 14 (61 Wh)",61,65),
    ("asus-vivobook-go-15","ASUS","VivoBook Go 15 (42 Wh)",42,45),("asus-vivobook-16x","ASUS","VivoBook 16X (50 Wh)",50,90),
    ("asus-zenbook-14-oled","ASUS","ZenBook 14 OLED (75 Wh)",75,65),("asus-tuf-gaming-f15","ASUS","TUF Gaming F15 (56 Wh)",56,200),
    ("asus-tuf-gaming-a15","ASUS","TUF Gaming A15 (90 Wh)",90,240),("asus-expertbook-b1","ASUS","ExpertBook B1 (42 Wh)",42,45),
    ("acer-aspire-lite-15","Acer","Aspire Lite 15 (36 Wh)",36,45),("acer-aspire-5-a515","Acer","Aspire 5 A515 (50 Wh)",50,65),
    ("acer-swift-3-sf314","Acer","Swift 3 SF314 (50 Wh)",50,65),("acer-nitro-5-an515","Acer","Nitro 5 AN515 (57.5 Wh)",57.5,180),
    ("acer-travelmate-p2","Acer","TravelMate P2 (53 Wh)",53,45),
    ("msi-modern-14-c12","MSI","Modern 14 C12M (39.3 Wh)",39.3,65),("msi-thin-gf63-12","MSI","Thin GF63 12U (51 Wh)",51,120),
    ("msi-cyborg-15-a12","MSI","Cyborg 15 A12 (53.5 Wh)",53.5,120),
    ("huawei-matebook-d14-2023","Huawei","MateBook D14 2023 (56 Wh)",56,65),("huawei-matebook-d15-2023","Huawei","MateBook D15 2023 (42 Wh)",42,65),
    ("samsung-galaxy-book3-15","Samsung","Galaxy Book3 15 (54 Wh)",54,45),
    ("microsoft-surface-laptop-go-3","Microsoft","Surface Laptop Go 3 (41 Wh)",41,39),("microsoft-surface-pro-9","Microsoft","Surface Pro 9 (47.7 Wh)",47.7,65),
    ("lg-gram-15","LG","gram 15 (80 Wh)",80,65),("lg-gram-16","LG","gram 16 (80 Wh)",80,65),
    ("apple-macbook-air-m3-13","Apple","MacBook Air 13 M3 (52.6 Wh)",52.6,35),("apple-macbook-air-m3-15","Apple","MacBook Air 15 M3 (66.5 Wh)",66.5,35),
    ("apple-macbook-pro-14-m3","Apple","MacBook Pro 14 M3 (70 Wh)",70,70),("apple-macbook-pro-16-m3","Apple","MacBook Pro 16 M3 (100 Wh)",100,140),
]
for id_, brand, model, wh, w in laptops:
    eff = 0.9 if brand == 'Apple' else 0.85
    add({"id":f"laptop-{id_}" if not id_.startswith(('apple','hp','dell','lenovo','asus','acer','msi','huawei','samsung','microsoft','lg')) else id_,"category":"laptop","brand":brand,"model":model,"batteryWh":wh,"chargeWatts":w,"efficiency":eff,"confidence":"medium"})

# ---------- UPS ----------
ups = [
    ("ups-apc-be425m","APC","Back-UPS BE425M 425VA (42 Wh)",42,8),("ups-apc-be600m1","APC","Back-UPS BE600M1 600VA (78 Wh)",78,10),
    ("ups-apc-bx750mi","APC","Back-UPS BX750MI 750VA (100 Wh)",100,12),("ups-apc-bx1100c","APC","Back-UPS BX1100C 1100VA (168 Wh)",168,15),
    ("ups-apc-br1500g","APC","Back-UPS Pro BR1500G 1500VA (216 Wh)",216,20),("ups-apc-bv650i","APC","Easy UPS BV650I 650VA (84 Wh)",84,10),
    ("ups-apc-bv1000i","APC","Easy UPS BV1000I 1000VA (144 Wh)",144,15),("ups-apc-bvx1200li","APC","Easy UPS BVX1200LI 1200VA (168 Wh)",168,15),
    ("ups-forza-nt-502a","Forza","NT-502A 500VA (60 Wh)",60,10),("ups-forza-nt-1002a","Forza","NT-1002A 1000VA (144 Wh)",144,15),
    ("ups-forza-fx-1500lcd","Forza","FX-1500LCD 1500VA (216 Wh)",216,20),("ups-forza-sl-1002ul","Forza","SL-1002UL 1000VA (144 Wh)",144,15),
    ("ups-cdp-rsmart-501","CDP","R-Smart 501 500VA (60 Wh)",60,10),("ups-cdp-rsmart-1010","CDP","R-Smart 1010 1000VA (144 Wh)",144,15),
    ("ups-cdp-rsmart-1210","CDP","R-Smart 1210 1200VA (168 Wh)",168,15),
    ("ups-cyberpower-cp425slg","CyberPower","CP425SLG 425VA (48 Wh)",48,8),("ups-cyberpower-cp685avrlcd","CyberPower","CP685AVRLCD 685VA (96 Wh)",96,12),
    ("ups-cyberpower-cp1500pfclcd","CyberPower","CP1500PFCLCD 1500VA (173 Wh)",173,20),
    ("ups-tripplite-avr550u","Tripp Lite","AVR550U 550VA (72 Wh)",72,10),("ups-tripplite-smart1500","Tripp Lite","SMART1500LCDT 1500VA (216 Wh)",216,20),
    ("ups-eaton-5e650i","Eaton","5E 650i 650VA (84 Wh)",84,10),("ups-eaton-5e1100i","Eaton","5E 1100i 1100VA (144 Wh)",144,15),
    ("ups-vertiv-iton-850va","Vertiv","Liebert itON 850VA (108 Wh)",108,12),
    ("ups-generic-1500va","Genérico","UPS 1500VA (216 Wh)",216,20),
]
for id_, brand, model, wh, w in ups:
    add({"id":id_,"category":"ups","brand":brand,"model":model,"batteryWh":wh,"chargeWatts":w,"efficiency":0.8,"confidence":"medium"})

# ---------- ROUTERS ----------
routers = [
    ("router-mini-ups-6000mah","Genérico","Mini UPS para router 6.000 mAh",22.2,12),("router-mini-ups-8000mah","Genérico","Mini UPS para router 8.000 mAh",29.6,18),
    ("router-mini-ups-16000mah","Genérico","Mini UPS para router 16.000 mAh",59.2,24),("router-mini-ups-24000mah","Genérico","Mini UPS para router 24.000 mAh",88.8,30),
    ("router-marsriva-kp4","Marsriva","KP4 Mini DC UPS 20.000 mAh",74,30),("router-marsriva-kp6","Marsriva","KP6 Pro Mini DC UPS 24.000 mAh",88.8,30),
    ("router-wgp-105","WGP","Mini UPS 105 12.000 mAh",44.4,18),("router-wgp-107","WGP","Mini UPS 107 20.000 mAh",74,24),
    ("router-ske-12000","SKE","Mini UPS 12.000 mAh",44.4,18),("router-talentcell-12v-12000","TalentCell","Mini UPS 12V 12.000 mAh",44.4,18),
    ("router-cudy-poe15","Cudy","POE15 DC UPS 10.000 mAh",37,18),("router-cudy-poe200","Cudy","POE200 DC UPS 20.000 mAh",74,24),
    ("router-huawei-e5573","Huawei","E5573 MiFi",5.55,10),("router-huawei-e5783","Huawei","E5783 MiFi",11.1,10),
    ("router-zte-mf920u","ZTE","MF920U MiFi",7.4,10),("router-zte-mf935","ZTE","MF935 MiFi",7.4,10),
    ("router-alcatel-mw41","Alcatel","LinkZone MW41 MiFi",6.66,10),("router-tp-link-m7000","TP-Link","M7000 MiFi",7.4,10),
    ("router-netgear-m1","Netgear","Nighthawk M1 MiFi",19.78,15),("router-dlink-dwr-932","D-Link","DWR-932 MiFi",7.4,10),
]
for id_, brand, model, wh, w in routers:
    add({"id":id_,"category":"router","brand":brand,"model":model,"batteryWh":wh,"chargeWatts":w,"confidence":"medium"})

# ---------- FANS / LAMPS / RADIOS ----------
# Fans
for inch, mah, w in [(6,3000,5),(6,6000,10),(8,4000,10),(8,7200,10),(10,8000,12),(10,10000,15),(12,7200,12),(12,12000,15),(14,12000,18),(16,12000,18),(16,20000,25),(18,15000,20)]:
    add({"id":f"fan-rech-{inch}in-{mah}mah","category":"fan","brand":"Genérico","model":f"Ventilador recargable {inch}\" {mah} mAh","batteryWh":mah_to_wh(mah),"chargeWatts":w})
for mah,w in [(1200,5),(2000,5),(2400,5),(3600,5),(4000,5),(5000,10),(8000,10),(10000,10)]:
    add({"id":f"fan-handheld-{mah}mah","category":"fan","brand":"Genérico","model":f"Ventilador de mano {mah} mAh","batteryWh":mah_to_wh(mah),"chargeWatts":w})
for mah,w in [(2000,5),(3000,5),(4000,10),(6000,10)]:
    add({"id":f"fan-neck-{mah}mah","category":"fan","brand":"Genérico","model":f"Ventilador de cuello {mah} mAh","batteryWh":mah_to_wh(mah),"chargeWatts":w})
fan_brands = [
    ("opolar-foldaway-10000","Opolar","Ventilador plegable 10.000 mAh",37,15),("jisulife-fa27-4000","Jisulife","Ventilador FA27 4.000 mAh",14.8,5),
    ("geek-aire-cf1-15000","Geek Aire","Ventilador CF1 15.000 mAh",55.5,18),("honeywell-ht900e","Honeywell","TurboForce portátil 4.000 mAh",14.8,10),
]
for id_, brand, model, wh, w in fan_brands:
    add({"id":id_,"category":"fan","brand":brand,"model":model,"batteryWh":wh,"chargeWatts":w})

# Lamps
for mah,w in [(600,3),(800,4),(1000,5),(1500,5),(1800,7),(2400,7),(3000,10),(3600,10),(5000,10)]:
    add({"id":f"lamp-bulb-led-{mah}mah","category":"lamp","brand":"Genérico","model":f"Bombillo LED recargable {mah} mAh","batteryWh":mah_to_wh(mah),"chargeWatts":w})
for mah,w in [(1200,5),(1800,7),(2400,8),(3600,10),(4800,10),(6000,12),(8000,15),(10000,18)]:
    add({"id":f"lamp-emergency-led-{mah}mah","category":"lamp","brand":"Genérico","model":f"Lámpara de emergencia LED {mah} mAh","batteryWh":mah_to_wh(mah),"chargeWatts":w})
for mah,w in [(1000,5),(1500,5),(2000,5),(2600,10),(3000,10),(5000,10)]:
    add({"id":f"lamp-flashlight-led-{mah}mah","category":"lamp","brand":"Genérico","model":f"Linterna LED recargable {mah} mAh","batteryWh":mah_to_wh(mah),"chargeWatts":w})
for mah,w in [(1200,5),(1800,5),(2400,7),(3000,10),(5000,10)]:
    add({"id":f"lamp-desk-led-{mah}mah","category":"lamp","brand":"Genérico","model":f"Lámpara de mesa recargable {mah} mAh","batteryWh":mah_to_wh(mah),"chargeWatts":w})
lamp_brands = [
    ("dp-7163-lamp","DP","Lámpara recargable DP-7163",11.1,8),("dp-led-9w-bulb","DP","Bombillo LED recargable 9W",4.44,5),
    ("kamisafe-km7605","Kamisafe","Lámpara recargable KM-7605",11.1,8),("geepas-ge53023","Geepas","Linterna recargable GE53023",14.8,10),
]
for id_, brand, model, wh, w in lamp_brands:
    add({"id":id_,"category":"lamp","brand":brand,"model":model,"batteryWh":wh,"chargeWatts":w})

# Radios
for mah,w in [(600,3),(1000,5),(1200,5),(1500,5),(1800,5),(2000,5),(2400,5),(3000,10),(4000,10)]:
    add({"id":f"radio-portable-fm-{mah}mah","category":"radio","brand":"Genérico","model":f"Radio portátil FM {mah} mAh","batteryWh":mah_to_wh(mah),"chargeWatts":w})
for mah,w in [(1200,5),(1800,5),(2400,5),(3000,10),(4000,10)]:
    add({"id":f"radio-bt-speaker-{mah}mah","category":"radio","brand":"Genérico","model":f"Radio Bluetooth {mah} mAh","batteryWh":mah_to_wh(mah),"chargeWatts":w})
radio_brands = [
    ("retekess-tr604","Retekess","TR604 Radio AM/FM recargable",3.7,5),("retekess-v115-radio","Retekess","V115 Radio portátil",3.7,5),
    ("xhdata-d808","XHDATA","D-808 Radio portátil",7.4,5),("prunus-j150","PRUNUS","J-150 Radio portátil",6.66,5),
    ("radio-solar-crank-3000","Genérico","Radio solar/manivela 3.000 mAh",11.1,5),("radio-emergency-5000","Genérico","Radio de emergencia 5.000 mAh",18.5,10),
]
for id_, brand, model, wh, w in radio_brands:
    add({"id":id_,"category":"radio","brand":brand,"model":model,"batteryWh":wh,"chargeWatts":w})

# ---------- MEDICAL / TOOLS / OTHER ----------
medical = [
    ("medical-nebulizer-mesh-1200","Genérico","Nebulizador de malla 1.200 mAh",4.44,5),("medical-nebulizer-portable-2000mah","Genérico","Nebulizador portátil 2.000 mAh",7.4,10),
    ("medical-bp-monitor-arm-usb","Genérico","Tensiómetro de brazo USB",7.4,5),("medical-bp-monitor-wrist-usb","Genérico","Tensiómetro de muñeca USB",3.7,5),
    ("medical-glucometer-usb","Genérico","Glucómetro recargable USB",2.22,5),("medical-thermometer-ir-usb","Genérico","Termómetro infrarrojo USB",3.7,5),
    ("medical-pulse-oximeter-usb","Genérico","Oxímetro de pulso USB",1.85,2),("medical-breast-pump-2000","Genérico","Extractor de leche 2.000 mAh",7.4,10),
    ("medical-massage-gun-2500mah","Genérico","Pistola de masaje 2.500 mAh",9.25,15),("medical-cpap-battery-99wh","Genérico","Batería de respaldo CPAP 99 Wh",99,45),
    ("medical-concentrator-battery-95wh","Genérico","Batería concentrador oxígeno portátil 95 Wh",95,60),("medical-baby-monitor-3000","Genérico","Monitor de bebé 3.000 mAh",11.1,10),
    ("omron-m3-usb","Omron","Tensiómetro M3 recargable USB",7.4,5),("microlife-b2-usb","Microlife","Tensiómetro B2 recargable",7.4,5),
    ("beurer-bm27-usb","Beurer","Tensiómetro BM 27 USB",7.4,5),("yuwell-m102-nebulizer","Yuwell","Nebulizador portátil M102",11.1,10),
]
for id_, brand, model, wh, w in medical:
    conf = "low" if wh > 80 else "medium"
    add({"id":id_,"category":"medical","brand":brand,"model":model,"batteryWh":wh,"chargeWatts":w,"confidence":conf})

tools = [
    ("dewalt-dcb203-20v-2ah","DeWalt","Batería DCB203 20V 2.0 Ah",40,40),("dewalt-dcb204-20v-4ah","DeWalt","Batería DCB204 20V 4.0 Ah",80,60),
    ("dewalt-dcb205-20v-5ah","DeWalt","Batería DCB205 20V 5.0 Ah",100,60),("makita-bl1820b-18v","Makita","Batería BL1820B 18V 2.0 Ah",36,45),
    ("makita-bl1840b-18v","Makita","Batería BL1840B 18V 4.0 Ah",72,45),("makita-bl1850b-18v","Makita","Batería BL1850B 18V 5.0 Ah",90,45),
    ("bosch-gba18v20","Bosch","Batería GBA 18V 2.0 Ah",36,60),("bosch-gba18v40","Bosch","Batería GBA 18V 4.0 Ah",72,60),
    ("milwaukee-m18-2ah","Milwaukee","Batería M18 2.0 Ah",36,60),("milwaukee-m18-5ah","Milwaukee","Batería M18 5.0 Ah",90,60),
    ("ryobi-one-18v-2ah","Ryobi","Batería ONE+ 18V 2.0 Ah",36,40),("ryobi-one-18v-4ah","Ryobi","Batería ONE+ 18V 4.0 Ah",72,40),
    ("blackdecker-20v-2ah","Black+Decker","Batería 20V 2.0 Ah",40,40),("ingco-20v-2ah-fbli2002","Ingco","Batería 20V 2.0 Ah FBLI2002",40,50),
    ("total-20v-2ah-tbli2002","Total","Batería 20V 2.0 Ah TBLI2002",40,50),("worx-20v-2ah-wa3578","Worx","Batería 20V 2.0 Ah WA3578",40,60),
    ("tool-soldering-usb","Genérico","Cautín USB recargable",7.4,10),("tool-glue-gun-usb","Genérico","Pistola de silicona USB",7.4,15),
    ("tool-rotary-usb","Genérico","Minitorno inalámbrico USB",11.1,12),("tool-screwdriver-usb","Genérico","Destornillador eléctrico USB",7.4,10),
    ("tool-air-compressor-usb","Genérico","Compresor portátil USB",22.2,15),("tool-vacuum-handheld-usb","Genérico","Aspiradora portátil USB",11.1,10),
]
for id_, brand, model, wh, w in tools:
    add({"id":id_,"category":"tool","brand":brand,"model":model,"batteryWh":wh,"chargeWatts":w,"confidence":"medium"})

other = [
    ("jbl-go-2","JBL","Go 2",2.7,5),("jbl-clip-4","JBL","Clip 4",3.7,5),
    ("jbl-flip-5","JBL","Flip 5",17.76,20),("jbl-charge-5","JBL","Charge 5",27,30),
    ("jbl-tune-510bt","JBL","Tune 510BT",1.66,5),("sony-wh-ch520","Sony","WH-CH520",1.85,5),
    ("sony-srs-xb13","Sony","SRS-XB13",1.78,5),("anker-soundcore-2","Anker","Soundcore 2",19.24,10),
    ("anker-soundcore-mini-3","Anker","Soundcore Mini 3",7.4,10),("xiaomi-mi-portable-bt-16w","Xiaomi","Mi Portable Bluetooth Speaker 16W",7.4,10),
    ("speaker-bt-5w-1200","Genérico","Bocina Bluetooth 5W 1.200 mAh",4.44,5),("speaker-bt-10w-1800","Genérico","Bocina Bluetooth 10W 1.800 mAh",6.66,10),
    ("speaker-bt-20w-3000","Genérico","Bocina Bluetooth 20W 3.000 mAh",11.1,10),("tws-case-300","Genérico","Audífonos TWS estuche 300 mAh",1.11,5),
    ("tws-case-500","Genérico","Audífonos TWS estuche 500 mAh",1.85,5),("headphones-bt-400","Genérico","Audífonos inalámbricos 400 mAh",1.48,5),
    ("headphones-bt-600","Genérico","Audífonos inalámbricos 600 mAh",2.22,5),
    ("kindle-2019","Amazon","Kindle (2019)",6.1,5),("kindle-paperwhite-11","Amazon","Kindle Paperwhite (11ª gen)",6.4,5),
    ("nintendo-switch-lite","Nintendo","Switch Lite",13.6,10),("nintendo-switch-oled","Nintendo","Switch OLED",16,39),
    ("steam-deck-lcd-40wh","Valve","Steam Deck LCD (40 Wh)",40,45),("console-retro-3000","Genérico","Consola retro portátil 3.000 mAh",11.1,10),
    ("gopro-hero11","GoPro","HERO11 Black (Enduro)",6.7,10),("action-cam-1050","Genérico","Cámara de acción 1.050 mAh",3.89,5),
    ("smartwatch-300","Genérico","Reloj inteligente 300 mAh",1.11,5),("fitness-band-150","Genérico","Pulsera fitness 150 mAh",0.56,2),
    ("xiaomi-smart-band-8","Xiaomi","Smart Band 8",0.7,2),("huawei-band-8","Huawei","Band 8",0.67,2),
    ("electric-toothbrush-usb","Genérico","Cepillo dental eléctrico USB",2.78,5),("water-flosser-usb","Genérico","Irrigador dental USB",7.4,5),
    ("hair-trimmer-usb","Genérico","Recortadora de pelo USB",4.44,5),("electric-shaver-usb","Genérico","Máquina de afeitar USB",2.22,5),
    ("walkie-talkie-1500","Genérico","Walkie-talkie 1.500 mAh",5.55,5),("walkie-talkie-2000","Genérico","Walkie-talkie 2.000 mAh",7.4,5),
    ("bike-light-front-2000","Genérico","Luz bicicleta delantera 2.000 mAh",7.4,5),("bike-light-rear-800","Genérico","Luz bicicleta trasera 800 mAh",2.96,3),
    ("ring-light-2000","Genérico","Aro de luz con batería 2.000 mAh",7.4,10),("mini-projector-5000","Genérico","Mini proyector portátil 5.000 mAh",18.5,20),
    ("keyboard-wireless-usb","Genérico","Teclado inalámbrico recargable",1.85,5),("mouse-wireless-usb","Genérico","Mouse inalámbrico recargable",1.11,5),
    ("label-maker-usb","Genérico","Etiquetadora recargable USB",4.44,5),("drone-battery-3s-2200","Genérico","Batería dron 11.1V 2.200 mAh",24.42,25),
]
for id_, brand, model, wh, w in other:
    add({"id":id_,"category":"other","brand":brand,"model":model,"batteryWh":wh,"chargeWatts":w,"confidence":"medium"})

print(f"NEW_DEVICES={len(devices)}")
print(f"TOTAL_UNIQUE_IDS={len(existing)}")

out_path = os.path.join(RAW_DIR, 'extra_devices.json')
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(devices, f, ensure_ascii=False, indent=2)
print(f"WROTE={out_path}")
