/*
  RaghusLogicLab — payment settings for paid PDF downloads.
  Edit only the values in quotes, then commit and push in GitHub Desktop.

  upiId       : the UPI ID that receives the money (PhonePe → Profile → UPI ID), e.g. "9xxxxxxxxx@ybl"
  payeeName   : the name customers see in their UPI app
  amount      : price per PDF download, in rupees
  razorpayUrl : your Razorpay Payment Page / Payment Link (e.g. "https://rzp.io/l/xxxxxx"). Leave "" until you have one.
  usedIdsUrl  : web-app address of your "Payment ID checker" Google Apps Script (ends in /exec).
                It records every payment ID in a Google Sheet so the SAME ID can't download a second PDF
                on ANY phone or computer. Leave "" and the ID is blocked only in the browser that used it.
                Setup steps: payment-id-checker/SETUP.md (in the folder next to this website).
*/
window.RLL_PAY_CONFIG = {
  upiId: "9491157078hdfc@ybl",
  payeeName: "RaghusLogicLab",
  amount: 10,
  razorpayUrl: "https://rzp.io/rzp/raghuslogiclab-pdf",
  usedIdsUrl: ""
};
