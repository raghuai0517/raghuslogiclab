/* APPSC Group 2 Prep Hall — History timeline and Economy story cards */
window.APPSC_DATA = window.APPSC_DATA || { subjects: [] };

/* [year label, sort key, era id, English, Telugu] */
APPSC_DATA.eras = [
  ["anc", "Ancient", "ప్రాచీన యుగం"], ["med", "Medieval", "మధ్య యుగం"],
  ["mod", "Modern", "ఆధునిక యుగం"], ["ap", "Andhra after 1900", "1900 తర్వాత ఆంధ్ర"]
];
APPSC_DATA.timeline = [
  ["c. 2600 BCE", -2600, "anc", "Mature Indus Valley Civilization: Harappa, Mohenjo-daro, Lothal.", "పరిణత సింధు లోయ నాగరికత: హరప్పా, మొహెంజొదారో, లోథాల్."],
  ["c. 1500 BCE", -1500, "anc", "Early Vedic age; the Rigveda is composed.", "తొలి వేద కాలం; ఋగ్వేద రచన."],
  ["6th century BCE", -550, "anc", "Buddha and Mahavira preach; rise of the Mahajanapadas.", "బుద్ధుడు, మహావీరుల బోధనలు; మహాజనపదాల ఆవిర్భావం."],
  ["c. 321 BCE", -321, "anc", "Chandragupta Maurya founds the Mauryan Empire.", "చంద్రగుప్త మౌర్యుడు మౌర్య సామ్రాజ్యాన్ని స్థాపించాడు."],
  ["c. 261 BCE", -261, "anc", "Kalinga war; Ashoka adopts Dhamma.", "కళింగ యుద్ధం; అశోకుడు ధర్మాన్ని స్వీకరించాడు."],
  ["1st c. BCE – 3rd c. CE", -50, "anc", "Satavahanas rule the Deccan; Amaravati stupa flourishes.", "శాతవాహనుల దక్కన్ పాలన; అమరావతి స్థూపం వైభవం."],
  ["3rd century CE", 250, "anc", "Ikshvakus rule from Vijayapuri (Nagarjunakonda).", "ఇక్ష్వాకులు విజయపురి (నాగార్జునకొండ) నుండి పాలించారు."],
  ["c. 320 CE", 320, "anc", "Gupta Empire begins under Chandragupta I.", "మొదటి చంద్రగుప్తునితో గుప్త సామ్రాజ్యం ప్రారంభం."],
  ["c. 624", 624, "med", "Eastern Chalukyas of Vengi founded by Kubja Vishnuvardhana.", "కుబ్జ విష్ణువర్ధనుడు వేంగి తూర్పు చాళుక్య వంశాన్ని స్థాపించాడు."],
  ["11th century", 1050, "med", "Nannaya begins the Telugu Mahabharata under Rajaraja Narendra.", "రాజరాజ నరేంద్రుని ఆదరణలో నన్నయ తెలుగు మహాభారతాన్ని ప్రారంభించాడు."],
  ["1206", 1206, "med", "Delhi Sultanate founded by Qutb-ud-din Aibak.", "కుతుబుద్దీన్ ఐబక్ ఢిల్లీ సుల్తానుల పాలనను స్థాపించాడు."],
  ["1262–1289", 1262, "med", "Rudramadevi rules the Kakatiya kingdom from Orugallu.", "రుద్రమదేవి ఓరుగల్లు నుండి కాకతీయ రాజ్యాన్ని పాలించింది."],
  ["1336", 1336, "med", "Vijayanagara Empire founded by Harihara and Bukka.", "హరిహర, బుక్క రాయలు విజయనగర సామ్రాజ్యాన్ని స్థాపించారు."],
  ["1509–1529", 1509, "med", "Reign of Sri Krishnadevaraya; golden age of Telugu literature.", "శ్రీకృష్ణదేవరాయల పాలన; తెలుగు సాహిత్య స్వర్ణయుగం."],
  ["1526", 1526, "med", "First Battle of Panipat; Babur founds Mughal rule.", "మొదటి పానిపట్ యుద్ధం; బాబర్ మొఘల్ పాలనను స్థాపించాడు."],
  ["1565", 1565, "med", "Battle of Talikota; fall of Hampi.", "తళ్లికోట యుద్ధం; హంపి పతనం."],
  ["1757", 1757, "mod", "Battle of Plassey; Company rule begins in Bengal.", "ప్లాసీ యుద్ధం; బెంగాల్‌లో కంపెనీ పాలన ప్రారంభం."],
  ["1852", 1852, "mod", "Sir Arthur Cotton completes the Godavari anicut at Dowleswaram.", "సర్ ఆర్థర్ కాటన్ ధవళేశ్వరం వద్ద గోదావరి ఆనకట్టను పూర్తి చేశాడు."],
  ["1857", 1857, "mod", "The Revolt of 1857 begins at Meerut.", "1857 తిరుగుబాటు మీరట్‌లో ప్రారంభమైంది."],
  ["1885", 1885, "mod", "Indian National Congress founded.", "భారత జాతీయ కాంగ్రెస్ స్థాపన."],
  ["1905", 1905, "mod", "Partition of Bengal; Swadeshi and Vandemataram movement.", "బెంగాల్ విభజన; స్వదేశీ, వందేమాతరం ఉద్యమం."],
  ["1913", 1913, "ap", "First Andhra Mahasabha at Bapatla.", "బాపట్లలో తొలి ఆంధ్ర మహాసభ."],
  ["1919", 1919, "mod", "Jallianwala Bagh massacre.", "జలియన్‌వాలాబాగ్ దురంతం."],
  ["1921", 1921, "ap", "Chirala–Perala movement led by Duggirala Gopalakrishnayya.", "దుగ్గిరాల గోపాలకృష్ణయ్య నాయకత్వంలో చీరాల–పేరాల ఉద్యమం."],
  ["1922–1924", 1922, "ap", "Rampa Rebellion led by Alluri Sitarama Raju.", "అల్లూరి సీతారామరాజు నాయకత్వంలో రంప తిరుగుబాటు."],
  ["1930", 1930, "mod", "Dandi March and the Civil Disobedience Movement.", "దండి యాత్ర, శాసనోల్లంఘన ఉద్యమం."],
  ["1937", 1937, "ap", "Sri Bagh Pact between Coastal Andhra and Rayalaseema leaders.", "కోస్తా ఆంధ్ర, రాయలసీమ నాయకుల మధ్య శ్రీబాగ్ ఒడంబడిక."],
  ["1942", 1942, "mod", "Quit India Movement.", "క్విట్ ఇండియా ఉద్యమం."],
  ["1947", 1947, "mod", "India becomes independent on 15 August.", "ఆగస్టు 15న భారతదేశానికి స్వాతంత్ర్యం."],
  ["1950", 1950, "mod", "The Constitution comes into force on 26 January.", "జనవరి 26న రాజ్యాంగం అమల్లోకి వచ్చింది."],
  ["1952", 1952, "ap", "Potti Sriramulu dies after a 58-day fast for an Andhra state.", "ఆంధ్ర రాష్ట్రం కోసం 58 రోజుల దీక్ష తర్వాత పొట్టి శ్రీరాములు అమరులయ్యారు."],
  ["1953", 1953, "ap", "Andhra State formed on 1 October; capital Kurnool.", "అక్టోబర్ 1న ఆంధ్ర రాష్ట్ర అవతరణ; రాజధాని కర్నూలు."],
  ["1956", 1956, "ap", "Andhra Pradesh formed on 1 November.", "నవంబర్ 1న ఆంధ్రప్రదేశ్ అవతరణ."],
  ["2014", 2014, "ap", "Telangana becomes a separate state on 2 June.", "జూన్ 2న తెలంగాణ ప్రత్యేక రాష్ట్రమైంది."]
];

/* Economy story cards: [term EN, term TE, meaning EN, meaning TE, story EN, story TE] */
APPSC_DATA.glossary = [
  ["GDP", "స్థూల దేశీయోత్పత్తి (GDP)", "Value of all final goods and services produced inside the country in a year.", "ఒక సంవత్సరంలో దేశం లోపల ఉత్పత్తి అయిన అంతిమ వస్తు, సేవల మొత్తం విలువ.", "A farmer sells paddy, a mill sells rice, a hotel sells meals. GDP counts only the meal, the final product, so nothing is counted twice.", "రైతు వడ్లు అమ్ముతాడు, మిల్లు బియ్యం అమ్ముతుంది, హోటల్ భోజనం అమ్ముతుంది. GDPలో చివరి వస్తువైన భోజనాన్ని మాత్రమే లెక్కిస్తారు; ఏదీ రెండుసార్లు లెక్కలోకి రాదు."],
  ["Inflation", "ద్రవ్యోల్బణం", "A sustained rise in the general price level.", "సాధారణ ధరల స్థాయి నిరంతరం పెరగడం.", "Last year ₹100 bought 4 kg of tomatoes; this year it buys 3 kg. The money is the same but it buys less.", "గత ఏడాది ₹100కి 4 కిలోల టమాటాలు వచ్చాయి; ఈ ఏడాది 3 కిలోలే వస్తున్నాయి. డబ్బు అంతే, కానీ కొనుగోలు శక్తి తగ్గింది."],
  ["Repo rate", "రెపో రేటు", "The rate at which the RBI lends short-term money to banks.", "RBI బ్యాంకులకు స్వల్పకాలిక రుణం ఇచ్చే వడ్డీ రేటు.", "When prices rise too fast the RBI raises the repo rate. Loans become costlier, people borrow and spend less, and prices cool down.", "ధరలు వేగంగా పెరిగినప్పుడు RBI రెపో రేటు పెంచుతుంది. రుణాలు ఖరీదవుతాయి, ప్రజలు తక్కువ అప్పు చేసి తక్కువ ఖర్చు చేస్తారు, ధరలు తగ్గుముఖం పడతాయి."],
  ["CRR", "నగదు నిల్వల నిష్పత్తి (CRR)", "The share of deposits a bank must keep with the RBI as cash.", "బ్యాంకు తన డిపాజిట్లలో RBI వద్ద నగదుగా ఉంచాల్సిన భాగం.", "If a bank gets ₹100 in deposits and CRR is 4%, it parks ₹4 with the RBI and can lend from the rest.", "బ్యాంకుకు ₹100 డిపాజిట్ వచ్చి, CRR 4% అయితే, ₹4 RBI వద్ద ఉంచి మిగతా దాని నుండి రుణాలు ఇవ్వగలదు."],
  ["Fiscal deficit", "ద్రవ్య లోటు", "Government's total spending minus its total income other than borrowings.", "ప్రభుత్వ మొత్తం వ్యయం − రుణాలు మినహా మొత్తం ఆదాయం.", "A family earns ₹30,000 a month but spends ₹36,000. The ₹6,000 it must borrow is its fiscal deficit.", "ఒక కుటుంబం నెలకు ₹30,000 సంపాదించి ₹36,000 ఖర్చు చేస్తే, అప్పు తేవాల్సిన ₹6,000 దాని ద్రవ్య లోటు."],
  ["Direct tax", "ప్రత్యక్ష పన్ను", "A tax paid by the same person on whom it is levied.", "ఎవరిపై విధిస్తారో వారే చెల్లించే పన్ను.", "An employee pays income tax on her own salary. She cannot pass it on to anyone else.", "ఉద్యోగి తన జీతంపై ఆదాయ పన్ను తానే చెల్లిస్తుంది. దాన్ని మరెవరిపైకీ నెట్టలేదు."],
  ["Indirect tax", "పరోక్ష పన్ను", "A tax collected by a seller and passed on to the buyer.", "అమ్మకందారు వసూలు చేసి కొనుగోలుదారుపైకి బదిలీ చేసే పన్ను.", "You buy a phone. The shop adds GST to the bill, collects it from you and pays it to the government.", "మీరు ఫోన్ కొంటారు. దుకాణం బిల్లులో GST కలిపి మీ దగ్గర వసూలు చేసి ప్రభుత్వానికి చెల్లిస్తుంది."],
  ["Subsidy", "రాయితీ", "Money the government pays to keep a price low for people.", "ప్రజలకు ధర తక్కువగా ఉంచడానికి ప్రభుత్వం భరించే మొత్తం.", "Rice costs ₹40 a kg in the market but a ration shop gives it for far less. The government pays the difference.", "మార్కెట్‌లో బియ్యం కిలో ₹40 ఉన్నా రేషన్ దుకాణంలో చాలా తక్కువకు ఇస్తారు. తేడాను ప్రభుత్వం భరిస్తుంది."],
  ["Minimum Support Price", "కనీస మద్దతు ధర (MSP)", "The price at which the government promises to buy a crop from farmers.", "రైతుల నుండి పంటను కొంటామని ప్రభుత్వం హామీ ఇచ్చే ధర.", "If traders offer less for paddy than the MSP, the farmer can sell to the government purchase centre at the MSP.", "వ్యాపారులు వడ్లకు MSP కంటే తక్కువ ధర ఇస్తే, రైతు ప్రభుత్వ కొనుగోలు కేంద్రంలో MSPకి అమ్ముకోవచ్చు."],
  ["Disguised unemployment", "ప్రచ్ఛన్న నిరుద్యోగం", "More people working than a job really needs.", "ఒక పనికి అవసరమైన దానికంటే ఎక్కువ మంది పని చేయడం.", "Five family members work a small field that three can manage. If two leave, the harvest stays the same.", "ముగ్గురు చేయగల చిన్న పొలంలో కుటుంబంలోని ఐదుగురు పని చేస్తారు. ఇద్దరు వెళ్లిపోయినా దిగుబడి తగ్గదు."],
  ["Per capita income", "తలసరి ఆదాయం", "National income divided by population.", "జాతీయాదాయాన్ని జనాభాతో భాగిస్తే వచ్చేది.", "A village of 100 people earns ₹1 crore a year. Per capita income is ₹1 lakh, even though some earn much more and some much less.", "100 మంది ఉన్న గ్రామం ఏడాదికి ₹1 కోటి సంపాదిస్తే తలసరి ఆదాయం ₹1 లక్ష; కొందరు ఎక్కువ, కొందరు తక్కువ సంపాదించినా సరే."],
  ["Balance of payments", "చెల్లింపుల శేషం", "The record of all money a country receives from and pays to the rest of the world.", "ఒక దేశం ఇతర దేశాల నుండి పొందే, వాటికి చెల్లించే మొత్తాల పూర్తి లెక్క.", "India earns dollars by exporting shrimp and software and spends dollars on crude oil. The yearly account of both is the balance of payments.", "భారతదేశం రొయ్యలు, సాఫ్ట్‌వేర్ ఎగుమతులతో డాలర్లు సంపాదిస్తుంది; ముడి చమురుకు డాలర్లు ఖర్చు చేస్తుంది. ఈ రెండింటి వార్షిక లెక్కే చెల్లింపుల శేషం."],
  ["Poverty line", "దారిద్ర్య రేఖ", "The minimum spending needed to meet basic needs; people below it are counted as poor.", "కనీస అవసరాలు తీరడానికి కావాల్సిన కనీస వ్యయం; దాని కంటే తక్కువ ఉన్నవారిని పేదలుగా లెక్కిస్తారు.", "Committees such as Tendulkar and Rangarajan worked out how much a person must spend each month on food, health and education to be above the line.", "టెండూల్కర్, రంగరాజన్ వంటి కమిటీలు ఆహారం, ఆరోగ్యం, విద్య కోసం ఒక వ్యక్తి నెలకు ఎంత ఖర్చు చేస్తే రేఖకు పైన ఉంటాడో లెక్కించాయి."],
  ["Self-Help Group", "స్వయం సహాయక సంఘం (SHG)", "A small group, usually of women, that saves together and lends to its members.", "కలిసి పొదుపు చేసి సభ్యులకు రుణాలు ఇచ్చుకునే చిన్న సంఘం; సాధారణంగా మహిళలది.", "Ten women each save a little every month. A member borrows from the pool for a sewing machine, repays, and the bank then lends the group more.", "పది మంది మహిళలు నెలనెలా కొంత పొదుపు చేస్తారు. ఒక సభ్యురాలు కుట్టు మిషన్ కోసం ఆ నిధి నుండి రుణం తీసుకుని తిరిగి చెల్లిస్తుంది; తర్వాత బ్యాంకు సంఘానికి మరింత రుణం ఇస్తుంది."],
  ["Finance Commission", "ఆర్థిక సంఘం", "A body set up every five years under Article 280 to share taxes between the Centre and the states.", "కేంద్ర, రాష్ట్రాల మధ్య పన్నుల పంపిణీ కోసం 280వ అధికరణం కింద ప్రతి ఐదేళ్లకు ఏర్పడే సంస్థ.", "Think of the Centre's tax collection as one big pot. The Finance Commission decides what share goes to all the states and how much each state gets.", "కేంద్రం వసూలు చేసే పన్నులను ఒక పెద్ద కుండగా అనుకోండి. అందులో రాష్ట్రాలన్నింటికీ ఎంత వాటా, ఒక్కో రాష్ట్రానికి ఎంత అనేది ఆర్థిక సంఘం నిర్ణయిస్తుంది."],
  ["Liberalisation", "సరళీకరణ", "Removing government controls and licences on business.", "వ్యాపారంపై ప్రభుత్వ నియంత్రణలు, లైసెన్సులను తొలగించడం.", "Before 1991 a company needed a licence to start or expand most factories. After the 1991 reforms most industries no longer needed one.", "1991కి ముందు చాలా కర్మాగారాలను ప్రారంభించడానికి, విస్తరించడానికి లైసెన్స్ కావాలి. 1991 సంస్కరణల తర్వాత చాలా పరిశ్రమలకు ఆ అవసరం లేదు."]
];
