#!/usr/bin/env python3
"""Generate plantdoc_locale.json (am/om/ar). Run: python3 build_plantdoc_locale.py"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
PLANTDOC = HERE.parent / "plantdoc"
OUT = PLANTDOC / "plantdoc_locale.json"

AM = {
    "apple_scab_leaf": ("የአፕል ቅጠል ሳብ (ስካብ)", "በቅጠልና ፍሬ ላይ ጥቁር ወይም ቆርቆሮ ቀለም ያሉ ነቀፋዎች፤ በእርጥበት ወቅት በቅጠል ጎን የደረቅ ወይፈኖ ቀለም ስፍራዎች።", "የወደቁ ቅጠሎችን ያፀዱ፣ እንዲነፍስ ብቻ የሚያደርግ ይፍጨን ጫር፣ በመመሪያ ኮፐር ወይም የተፈቀደ ፈንጋይ መድሃኒት፣ የሚቋቋም ዝርያ ምረጥ።"),
    "apple_leaf": ("የአፕል ጤናማ ቅጠል", "ለመረጃ የሚያገለግል ጤናማ የአፕል ቅጠል መልክ፤ ሳብ ወይም ዝጉባ አልያዘም።", "ሚዛናዊ ኤቾቲን፣ ቅጠል ማቆየት በሌሊት ይቀንሱ፣ ዋናውን ሳብ/ዝጉባ በቅጽል ወቅት ይቆጣጠሩ።"),
    "apple_rust_leaf": ("የአፕል ዝጉባ ቅጠል", "ከታች ከቅጠል በኩል ብርና ቢጫ ነጠብጣብ ስፍራዎች፤ አቅራቢያ የጁኒፐር አለም ጥላ ሊወድቅ ይችላል።", "ተለዋዋጭ አስተናጋጅ ተኮች ያራቁ እንደተቻለ፣ በፍቅ ወቅት የቅጠል እድገት ላይ የፈንጋይ ፕሮግራም።"),
    "bell_pepper_leaf": ("የቤል ፔፐር ጤናማ ቅጠል", "ስነ ምህዳራዊ በሆነ ምስል የጤናማ የፈረፋ ጎማ ቅጠል ይመስላል።", "ከላይ የሚዘንበፍ መስጫ ይቀንሱ፤ ቫይረስ ለመከላከል አፒድ ይቆጣጠሩ።"),
    "bell_pepper_leaf_spot": ("የቤል ፔፐር ቅጠል ነቀፋ", "ክቦች ወይም ማዕዘናዊ ነቀፋዎች ከቢጫ ክበብ፤ በእርጥበት ሁኔታ ሊዋሃዱ ይችላሉ።", "አየር ማስተላለፍ ያሻሽሉ፣ ርጥብ ተክል ላይ ስራ ይቀንሱ፣ ባክቴሪያዊ ከሆነ ኮፐር ወይም የተፈቀደ ባክቴሪ ሣይድ፣ ይዞታ ቅያር።"),
    "blueberry_leaf": ("የብሉቤሪ ጤናማ ቅጠል", "በአፈር ምህዳር የሚታይ ትፈላጊ የብሉቤሪ ቅጠል ጤና።", "በሜዳው እርስ በእርስ ፒኤች ~4.5–5.5፣ ማይስጥር መተንፈስ፣ ሰርካዕ ማለፕ ስሮችን ያረጋግጡ።"),
    "cherry_leaf": ("የቼሪ ጤናማ ቅጠል", "ጤናማ የቼሪ ቅጠል፤ ጨዋ ስድስት እና ኪሮስ ምድቦችን ያካትታል።", "ለቅጠል ነቀፋ ፈተናዎች ጽዳት፣ ያስፈልግ ከሆነ የአንሰት ፈንጋይ።"),
    "corn_gray_leaf_spot": ("የበቆላ ብርቱዕ ቅጠል ነቀፋ (ራፍ)", "በእርጥብ ክልሎች በኅልድ መካከል ሬክታንግላር ምርጫ/tan ነቀፋዎች።", "የሚዋጋ ህይወት ከተር፣ ይዞታ ማተላለፍ፣ ቅድመ መክደያ ለቀሚያ፣ ኢኮኖሚያዊ ጥበብ ቢያንስ እንኳን ፈንጋይ።"),
    "corn_leaf_blight": ("የበቆላ ቅጠል ብላይት", "ተራዝሞ የታነባ ብርት ቀለም ነቀፋዎች፤ ሰሜን/ደቡብ ድርጅቶች በአሻራ ልዩነት ይለያያሉ።", "የሚዋጋ ዝርያዎች፣ የቀሚያ አስተዳደር፣ ከፍተኛ ዋጋ ያለው ባለቤት አፈር ላይ ወቅታዊ ፈንጋይ።"),
    "corn_rust_leaf": ("የበቆላ ዝጉባ ቅጠል", "በቅጠል ላይ ብር ቀለም ነጠብጣብ ስፍራዎች (ወርቅ እስከ ዘንባባ)።", "ብዙውን ጊዜ የኋለኛ ጊዜ፣ የቅጠል መውደቅ ኢኮኖሚን ካስቸገረ ገምግም፣ ጥበብ እንደተመቻቸ ፈንጋይ።"),
    "grape_leaf": ("የወይን ጤናማ ቅጠል", "ለመረጃ የሚያስተናግድ ጤናማ የወይን ቅጠል።", "ለፀሃይና ለአየር የሚያልፍ ኮናፒ፣ በክልሉ የሚልድዩ/ጥቁር ሮት ፕሮግራም።"),
    "grape_leaf_black_rot": ("የወይን ቅጠል ጥቁር ሮት", "የሽት እቃ ነቀፋዎች፣ ጥቁር ፍሬ ሰብሶ፤ ፍሬ ሊሰበር (ሙሚ) ይችላል።", "ሰናጅ (ሙሚ)፣ ክነና ክፍት፣ በአበባ/ፍረሀበባ የመከላከያ ፈንጋይ።"),
    "peach_leaf": ("የፒች ጤናማ ቅጠል", "ጤናማ የፒች ቅጠሎች፤ ሌሎች ስብስት ከኮርል/ደብዳቤ ጋር።", "የአንሰት ኮፐር ለአንቲ/curl የሚያስፈልግ ከሆነ፣ ኤቾቲን በመጠን ይቆጣጠሩ።"),
    "potato_leaf": ("የድንች ጤናማ ቅጠል", "ለመጠቀም የሚሆን ጤናማ የድንች ቅጠል።", "ቡኃዊ መስፈፋ፤ ብላይት ቁጣጣር፤ የተረጋገጠ ዘር፣ ከሰዓት በኋላ ከላይ መስጫ ይቀንሱ።"),
    "potato_leaf_early_blight": ("የድንች ቅጠል ቀደም ብላይት", "የመሥመር ቀለበት ('ልዕሚት') ነቀፋዎች ብዙውን ከግል ቅጠቶች ይጀምራል።", "ኤቾቲን ሚዛን፣ በረሃ ስታስ፣ በእርጥብ ወቅት የፈንጋይፎፕራም።"),
    "potato_leaf_late_blight": ("የድንች ቅጠል ዘግዋን ብላይት", "ውሃ የያዙ ቦታዎች ወደ ጥቁር፤ በእርጥብ ምሽት ነጭ ቅቅፍ።", "የሚዋጋ ዝርያዎች፣ ጥሬ ምርት ያስወግዱ፣ በሚስማማ አየር ፈንጋይ።"),
    "raspberry_leaf": ("የራዝቤሪ ጤናማ ቅጠል", "ጤናማ የራዝቤሪ ቅጠል መልክ።", "ለአየር ቅጨና፣ ቫይረስ ተቀባዮች (አፒድ) በቅርንጫፍ ፍራፍሬ።"),
    "soyabean_leaf": ("የሶያ ጤናማ ቅጠል", "ጤናማ የሶያ ቅጠል የመመሪያ።", "ይዞታ ማዞር፣ ዘር ክብካቤ፣ ዝጉባ/ፍሮግዬ በአካባቢ ይቆጣጠሩ።"),
    "squash_powdery_mildew_leaf": ("የስኳሽ ለምለም ነጭ ቅባ ያለው ቅጠል", "ከቅጠል በላይ ነጭ ዱቄት ያለው ቅርፅ፤ በአርፍቀት ቀኖች ለጥርስሳ ያፋጣል።", "የሚዋጋ ዝርያ፣ ብረሐ/ባዮሎጂካል፣ ከባዩ ዕቃ ያራቁ እንደተቻለ።"),
    "strawberry_leaf": ("የስትሮበሪ ጤናማ ቅጠል", "ጤናማ የስትሮበሪ ቅጠልመሰረት።", "ማለፕ፣ የቅጠል እርጥበት ይቀንሱ፣ ቡኃላዎች ይነዳሉ፤ ሚትንና የስፋት ነሠራ ይቆጣጠሩ።"),
    "tomato_early_blight_leaf": ("የቲማቲም ቀደም ብላይት ቅጠል", "የመሥመር ቅርፀቶች ('ልዕሚት') ብዙውን ከድሃኝ ቅጠቶች ይፈጠራል።", "ማለፕ፣ መደገፍ፣ በእርጥብ ወቅት መርሀ-ግብር ፈንጋይ።"),
    "tomato_leaf": ("የቲማቲም ጤናማ ቅጠል", "ጤናማ የቲማቲም ቅጠል ማጣቀሻ።", "ተመሳሳይ መሳፈያ፣ ለችርቻሮ የባህር ጫፍ መከላከያ ካልሲየም፣ ቱኔል ውስጥ የአየር መተላለፍ።"),
    "tomato_leaf_bacterial_spot": ("የቲማቲም ባክቴሪያዊ ቅጠል ነቀፋ", "ትናነሽ ጥቁር ነካ ከቢጫ ክበብ፤ በፍረም ላይ ደግሞ 'ውጊት' ሊመስል ይችላል።", "የተረጋገጠ ዘር/ተክል፣ ከላይ መስጫ ይቀንሱ፣ ቀደም ሲሉ ኮፐር፣ ይዞታ ቅያር።"),
    "tomato_leaf_late_blight": ("የቲማቲም ዘግዋን ብላይት ቅጠል", "የዘይት ምስል ያላቸው አይደሉም ነቀፋዎች፤ በእርጥበት ምስራቅ ቅርጫት።", "የሚዋጋ ዝርያዎች፣ በአትክልት ውስጥ ታመሙ ተኮች በፍጥነት ያስወግዱ፣ መነሻ ላይ ፈንጋይ።"),
    "tomato_leaf_mosaic_virus": ("የቲማቲም ሞዛይክ ቫይረስ ቅጠል", "የቀለም ለውጥ፣ እንጨት እንደ ቅርጭት ማዞር፣ አቅርቦት ከቫይረስ ቅርጥ።", "ታመሙ ተኮች አስወግድ፣ አፒድ ይቆጣጠሩ፣ መሳሪያ አጽዳ፣ ቫይረስ-ነፃ ዘር።"),
    "tomato_leaf_yellow_virus": ("የቲማቲም ቢጫ ቫይረስ ቅጠል", "ቢጫ ቀለም፣ መዞር፣ አቅርቦት—ብዙውን በነጭ ነፍስጫር ትራንስፖርት ያደርጋል።", "ራቢያተ ብርቱ ማለፕ፣ ነጭ ነፍስጫር አስተዳደር፣ ዝርያ የሚዋጋ በተገኘበት።"),
    "tomato_mold_leaf": ("የቲማቲም ፈንጋይ ቅጠል", "የቅብስ ፈንጋይ በሽመራ ሥጋ ወይም በአፍራሽ እርጥበት ክፈፍ።", "ጋሪ ጥሩ አየር ነጠብጣብ፣ አየር ማስተላለፍ፣ ተገዢ ፈንጋይ።"),
    "tomato_septoria_leaf_spot": ("የቲማቲም ሴፕቶሪያ ቅጠል ነቀፋ", "ትናንሽ ክቦች ከጥቁር ድንበርና በሜካ ቀለም ማዕከል፤ ጥቁር ትናንሽ ነጥቦች።", "መሬት ላይ ማለፕ የሚያጠፋ፣ ተመኑ ቁራጭ አስወግድ፣ በእርጥበት አመታት የፈንጋይ ምዝቋል።"),
    "tomato_two_spotted_spider_mites_leaf": ("የቲማቲም ሁለት ስፎት ስፓይደር ሚት ቅጠል", "ጠፍጣፋ መጐስጐስ እና በረንዘድ፤ በከባድ ውርጭ መረብ።", "ከባይ ከባይ ሁኔታ ይቆዩ፣ አመቃ ተቋቁሞች፣ ሆርትካል ዘይት/ሳቦ በደረጃ።"),
}

OM = {
    "apple_scab_leaf": ("Baala Afaalee scarbii", "Balaa'a fuduraa baalaafi mirkanaa irratti jijjiiramoo hambaa, yeroo nyaatumsaatti akka baliinsaa omishaa ta'e.", "Balloofte qorachuu, qarreen qilleensa ni dhiyeessu, sulfur ykn fungicide mallattoo irratti; tarsimoo dand'amu filadhu."),
    "apple_leaf": ("Baala Afaalee fayyaa", "Baala Afaalee fakkataa fayyaa suura biyyaa keessatti bal'aa fi rust keessatti hin jiru.", "Walitti qabamnaan nyaata, balaan bosona hambaa irraa of eegu, yeroo duraa scouting."),
    "apple_rust_leaf": ("Baala Afaalee rust", "Gogduu diimaa-gurraacha gubbaa baalaa jalaatti; muka juniperitti dhiyeessuu dabalataa.", "Meeshaalee dhiisee baasu yoo dand'ame; yerroo gannaa fungicide."),
    "bell_pepper_leaf": ("Baala qumbii fayyaa", "Baala qumbii fayyaa suura biyyaa keessatti.", "Irraan ga'uu umrii irraa of qusadhu; afiidii bulchuu."),
    "bell_pepper_leaf_spot": ("Mallattoo baala qumbii", "Gubbaa diimaa ykn sadarkaa dhibbaa lakkoofsi, yeroo bishaanii walitti hidhamu.", "Qilleensoota fooyessuu, hojii baala irratti hin turin bishaanii; copper; dhabbatummaa."),
    "blueberry_leaf": ("Baala buluberii fayyaa", "Baala buluberii fayyaa suura biyyaa keessatti.", "Lafa pH 4.5–5.5, bishaan ni argamu, mulch."),
    "cherry_leaf": ("Baala cherii fayyaa", "Baala cherii fayyaa, gosa sirrii fi haqaa.", "Qulqullinaan bal'aa, fungicide yeroo ba'uu."),
    "corn_gray_leaf_spot": ("Manca baaldiimaa magariisaa", "Mallattoo rektanggilii gurbaa-gadadoo giddu gidduu hirriyyaa baaldiimaa bishaan qabeenyaa keessatti.", "Hybrid dandeettii, dhabbatummaa, qoricha yoo hin kafalamneen."),
    "corn_leaf_blight": ("Manca baaldiimaa", "Mallattoo dheeraa tan; mancaawwan kaaba/baatisaa adda addaa.", "Gosa dandeettii, qabannoo balleessa, fungicide yeroo barbaachisaa."),
    "corn_rust_leaf": ("Baaldiimaa rust", "Gogduu diimaa-sammuu gubbaa fi jalaa baalaa.", "Yeroo dhumaa yeroo baay'ee; yoo baalli dhufa fungicide."),
    "grape_leaf": ("Baala canaan fayyaa", "Baala canaan fayyaa gatamee.", "Mana baalaa fooyessuu; taphaa naannoo."),
    "grape_leaf_black_rot": ("Dukkana baala canaan", "Mallattoo qarqaraa, madda diimaa; mirkanni micciiruu.", "Qulqullinaa, mana bakka bu'aa, fungicide yeroo ubseeti."),
    "peach_leaf": ("Baala piichii fayyaa", "Baala piichii fayyaa.", "Kopper yeroo duraa yoo barbaachisaa; nyaataan hin naafnee."),
    "potato_leaf": ("Baala danyee fayyaa", "Baala danyee fayyaa.", "Mana uumuu, qorannoo blayitii, sim siftanaa hayyamaa, irraan ga'uu madaaluu."),
    "potato_leaf_early_blight": ("Manca danyee yeroo duraa", "Giddugalee lakoolsaa, baala gadi jalqabaa.", "Nyaata madaaluu, stress xiqqeessuu, fungicide yeroo bishaan qabessa."),
    "potato_leaf_late_blight": ("Manca danyee yeroo dhuma", "Gurbaa bishaanitti fuduraa, yeroo halkaniin balballaa diimaa.", "Gosa dandeettii, miidhaa balleessuu, fungicide yeroo mijaa."),
    "raspberry_leaf": ("Baala raazoberii fayyaa", "Baala raazoberii fayyaa.", "Qophaa'uu fooyessuu; afiidii to'achuu."),
    "soyabean_leaf": ("Baala soyaa fayyaa", "Baala soyaa fayyaa.", "Dhabbatummaa, sim siftanaa, scout rust."),
    "squash_powdery_mildew_leaf": ("Balballaa adii Squash", "Gubbaa baalaa bal banaa; yeroo ho'aafi halkan qilleessaatti bal'ina.", "Gosa dandeettii, sulfur; baala miidhaa guddaa balleessuu."),
    "strawberry_leaf": ("Baala istirooberii fayyaa", "Baala istirooberii fayyaa.", "Mulch, balaan bosona, gosa beds; mite bulchuu."),
    "tomato_early_blight_leaf": ("Manca tamaatii yeroo duraa", "Mallattoo lakoolsaa, baala mo'aa jalqaba.", "Mulch, gorraacha, fungicide yeroo bishaan qabessa."),
    "tomato_leaf": ("Baala tamaatii fayyaa", "Baala tamaatii fayyaa.", "Bishaan madaaluu, kaalsiyeemii, mana tunnel qilleensa."),
    "tomato_leaf_bacterial_spot": ("Mallattoo baktariyamaa tamaatii", "Gogduu xiqqoo diimaa lakkoofsa diimaa; mirkanaa irraas.", "Sim siftanaa hayyamaa, irraan ga'uu xiqqeessuu, copper, dhabbatummaa."),
    "tomato_leaf_late_blight": ("Manca tamaatii yeroo dhuma", "Gurbaa yeroo bishaanii, balballaa yeroo qilleessaatti.", "Gosa dandeettii, miciirama balleessuu, fungicide."),
    "tomato_leaf_mosaic_virus": ("Vaayirasii mozaayikii tamaatii", "Gurraacha, fakkataa muka, gadi bu'ina.", "Miciiru balleessuu, afiidii, mizzoo nyaachuu, sim siftanaa."),
    "tomato_leaf_yellow_virus": ("Vaayirasii magariisaa tamaatii", "Magariisaa, goofta, gadi bu'ina—xiiyyafitti.", "Mulch ifaattee, xiiyyara bulchuu."),
    "tomato_mold_leaf": ("Fungi tamaatii", "Uumama duumessa yeroo nyaataafi qilleensa xiqqaa.", "Qilleensa garaagaraa, mancer fi fungicide."),
    "tomato_septoria_leaf_spot": ("Mallattoo Septooriyaa", "Gogduu yeroo lakkoofsa gabatee fi giddu diimaa.", "Lafa mulch, balleessitu, fungicide yeroo bishaan qabessa."),
    "tomato_two_spotted_spider_mites_leaf": ("Xiiyyee lamaa Mite", "Qaxxaamuruu, gurraacha, web yeroo hambaa.", "Bahaa nyaachuu, mite ittisa, salphaatti siqqee."),
}

AR = {
    "apple_scab_leaf": ("تلف ورق التفاح (الجرب)", "بقع داكنة أو قشرية على الأوراق والثمار؛ بقع زيتونية مخملية على الوجه السفلي في الرطوبة.", "كنس الأوراق المتساقطة، تقليم لتمرير الهواء، كبريت أو فطرية حسب التعليمات، أصناف مقاومة."),
    "apple_leaf": ("ورق تفاح سليم", "مظهر ورق تفاح سليم كمرجع في مجموعة البيانات.", "تغذية متوازنة، تقليل بلل الأوراق ليلاً، رصد مبكر للجرب/الصدأ."),
    "apple_rust_leaf": ("صدأ ورق التفاح", "بؤر برتقالية-صفراء على وجه الورك السفلي؛ قد يسبب تساقطاً قرب العفص.", "إزالة المضيفين البدائين حيث يمكن؛ برنامج فطرية عند انفتاح الأوراق."),
    "bell_pepper_leaf": ("ورق فلفل حلو سليم", "مظهر ورق سليم للفلفل في الصور الميدانية.", "تقليل الري العلوي؛ مكافحة حشرات المن لتقليل الفيروسات."),
    "bell_pepper_leaf_spot": ("بقع ورق الفلفل", "بقع دائرية أو زاوية مع هالات صفراء؛ قد تندمج في الرطوبة.", "تهوية، تجنب العمل على نباتات مبللة، نحاس أو مبيدات بكتيرية؛ تناوب."),
    "blueberry_leaf": ("ورق توت أزرق سليم", "أوراق توت أزرق سليمة في مشاهد طبيعية.", "تربة حمضية 4.5–5.5، ري منتظم، نشارة للجذور."),
    "cherry_leaf": ("ورق كرز سليم", "ورق كرز سليم؛ يشمل أنواعاً حامضة وحلوة.", "نظافة ضد أمراض الأوراق، معالجات شتوية عند الحاجة."),
    "corn_gray_leaf_spot": ("لفحة رمادية لذرة", "آفات مستطيلة رمادية-بيج بين عروق الورق؛ شائعة في مناطق رطبة.", "هجن مقاومة، تناوب، تقليل بقايا؛ فطرية عند الحاجة."),
    "corn_leaf_blight": ("لفحة ورق الذرة", "آفات طويلة لونها أسمر؛ يختلف نمط الشمال/الجنوب.", "أصناف مقاومة، إدارة بقايا، فطرية في حقول عالية القيمة."),
    "corn_rust_leaf": ("صدأ الذرة", "بؤر صدأ برتقالية إلى قرفية على سطحي الورقة.", "غالباً في آخر الموسم؛ راقب الإجهاد الورقي والمبيد عند اللزوم."),
    "grape_leaf": ("ورق عنب سليم", "مرجع ورق عنب سليم.", "تأسيس مظلة جيدة وبرامج محلية للبياض/التعفن الأسود."),
    "grape_leaf_black_rot": ("تعفن أسود لورق العنب", "آفات ممزقة؛ أجسام سوداء؛ قد يجف الثمر.", "إزالة الثمار المومياء، فتح المظلة، وقاية عند الإزهار/العقد."),
    "peach_leaf": ("ورق خوخ سليم", "أوراق خوخ سليمة.", "نحاس شتوي عند اللزوم؛ تجنب الإفراط في النيتروجين."),
    "potato_leaf": ("ورق بطاطس سليم", "مرجع ورق بطاطس سليم.", "التكويم، رصد اللفحة، بذار معتمد، تقليل الرش المسائي."),
    "potato_leaf_early_blight": ("لفحة مبكرة للبطاطس", "حلقات مستهدفة غالباً في أسفل المظلة.", "توازن تغذية، تخفيف إجهاد، فطرية في مواسم رطبة."),
    "potato_leaf_late_blight": ("لفحة متأخرة للبطاطس", "بقع متشربة بالماء تتحول لبنية؛ بياض ليلي رطب.", "أصناف مقاومة، إزالة المصاب، مبيد في الطقس المناسب."),
    "raspberry_leaf": ("ورق توت العليق سليم", "مظهر ورق سليم.", "تقليم للتهوية؛ مكافحة حاملات الفيروس."),
    "soyabean_leaf": ("ورق فول صويا سليم", "مرجع ورق صويا سليم.", "تناوب، معالجة البذور، رصد الصدأ."),
    "squash_powdery_mildew_leaf": ("بياض دقيق لقرع", "طبقة بيضاء بودرية على الوجه العلوي؛ ينتشر في حر وجاف وليال رطبة.", "أصناف مقاومة، كبريت/حيوية؛ إزالة الأوراك المصابة."),
    "strawberry_leaf": ("ورق فراولة سليم", "مرجع ورق فراولة سليم.", "نشارة، تقليل بلل الأوراق، تدوير الأسرة."),
    "tomato_early_blight_leaf": ("لفحة مبكرة للطماطم", "آفات مستهدفة غالباً في أوراق أقدم.", "نشارة، دعامات، فطرية مجدولة؛ قلّم بحذر."),
    "tomato_leaf": ("ورق طماطم سليم", "مرجع ورق طماطم سليم.", "ري متوازن، كالسيوم، تهوية الدفيئة."),
    "tomato_leaf_bacterial_spot": ("بقع بكتيرية للطماطم", "نقط داكنة مع هالة صفراء؛ قد تصيب الثمر.", "بذار/شتلات معتمدة، تقليل الرش، نحاس مبكر، تناوب."),
    "tomato_leaf_late_blight": ("لفحة متأخرة للطماطم", "آفات دهنية غير منتظمة؛ بياض على الهامش رطب.", "أصناف مقاومة، إزالة فورية في البستان، مبيد."),
    "tomato_leaf_mosaic_virus": ("فيروس موزاييك الطماطم", "تبرقش، تشويه، تقزم.", "إزالة المصاب، مكافحة المن، تعقيم، بذار نظيف."),
    "tomato_leaf_yellow_virus": ("فيروس اصفرار الطماطم", "اصفرار، تجعيد، تقزم—غالباً بواسطة الذبابة البيضاء.", "فيلم عاكس، مكافحة الذبابة، أصناف مقاومة."),
    "tomato_mold_leaf": ("عفن ورق الطماطم", "فطريات رقيقة على نسيج متقدم أو رطوبة عالية.", "تجفيف الهواء، تهوية، مبيد مستهدف."),
    "tomato_septoria_leaf_spot": ("بقع سيبتوريا للطماطم", "نقط دائرية بحدود داكنة ومركز بيج؛ نقط سوداء دقيقة.", "تغطية التربة، إزالة بقايا، تناوب مبيد رطب."),
    "tomato_two_spotted_spider_mites_leaf": ("حلم دودة العنكبوت لطماطم", "نقط دقيقة، برونزة، خيوط عند الضغط.", "تجنب الغبار، مفترسات، زيوت/صابون حسب المرحلة."),
}


def main():
    cls = json.loads((PLANTDOC / "plantdoc_classes.json").read_text(encoding="utf-8"))["classes"]
    out = {"am": {}, "om": {}, "ar": {}}
    for c in cls:
        cid = c["id"]
        for lang, d in (("am", AM), ("om", OM), ("ar", AR)):
            if cid in d:
                label, sy, mg = d[cid]
                out[lang][cid] = {"label": label, "symptoms": sy, "management": mg}
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print("Wrote", OUT, "counts", {k: len(v) for k, v in out.items()})


if __name__ == "__main__":
    main()
