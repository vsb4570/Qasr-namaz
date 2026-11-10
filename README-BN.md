# Qasr Salah — প্রথম সংস্করণ

এটি একটি বিনামূল্যের, মোবাইল-উপযোগী PWA প্রোটোটাইপ। এতে আছে:
- GPS লোকেশন নেওয়া (ব্যবহারকারীর অনুমতি সাপেক্ষে)
- OpenStreetMap-এ ঠিকানা খোঁজা ও মানচিত্রে পিন বাছাই
- বর্তমান ঠিকানা, স্থায়ী ঠিকানা ও সফরের গন্তব্য সংরক্ষণ
- চার মাজহাবের পছন্দ সংরক্ষণ
- PWA manifest ও প্রাথমিক service worker

## চালানো
`index.html` সরাসরি খোলার বদলে HTTPS-এ হোস্ট করুন বা লোকাল ডেভেলপমেন্ট সার্ভার ব্যবহার করুন। GPS এবং PWA-এর জন্য secure context (HTTPS বা localhost) দরকার।

## বিনামূল্যে প্রকাশ
1. GitHub-এ নতুন public repository তৈরি করুন।
2. এই ফোল্ডারের সব ফাইল repository-তে upload করুন।
3. Settings → Pages → Deploy from branch → `main` / root নির্বাচন করুন।
4. প্রকাশিত HTTPS ঠিকানা Android ও iPhone-এর browser-এ খুলুন; চাইলে Add to Home Screen করুন।

## গুরুত্বপূর্ণ সীমাবদ্ধতা
- এটি এখনো native Android APK বা iOS App Store অ্যাপ নয়; এটি installable web app prototype।
- ঠিকানা অনুসন্ধানে OpenStreetMap/Nominatim-এর public service ব্যবহার করা হয়েছে। তাদের usage policy মানতে হবে; উচ্চ ট্রাফিকের জন্য নিজস্ব/অনুমোদিত geocoding provider লাগতে পারে।
- ঠিকানা এই ডিভাইসের browser localStorage-এ থাকে; cloud sync বা user account নেই।
- কসর/জমার শরয়ি সিদ্ধান্তের ক্যালকুলেটর ইচ্ছাকৃতভাবে যোগ করা হয়নি। চার মাজহাবের নিয়ম নির্ভরযোগ্য আলেমের পর্যালোচনা ও যাচাই ছাড়া স্বয়ংক্রিয় ফতোয়া দেখানো উচিত নয়।
- Google Maps এখনো যুক্ত নয়; প্রথম সংস্করণে খরচ এড়াতে OpenStreetMap ব্যবহার করা হয়েছে।
