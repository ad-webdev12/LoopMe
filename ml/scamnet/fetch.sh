#!/bin/sh
# Downloads the public datasets ScamNet trains on into ml/scamnet/raw (not committed).
set -e
D="$(dirname "$0")/raw"; mkdir -p "$D"; cd "$D"; H=https://huggingface.co/datasets
curl -sL -o uci.parquet "$H/ucirvine/sms_spam/resolve/main/plain_text/train-00000-of-00001.parquet"
for p in train val test; do curl -sL -o scamshield_$p.csv "$H/rasheq/scam-shield-sms/resolve/main/$p.csv"; done
curl -sL -o otp.csv "$H/alusci/sms-otp-spam-dataset/resolve/main/SMS_OTP_10000_samples.csv"
curl -sL -o indian_scam.csv "$H/karanverma19/Indian_Multilingual_Scam_Message_Dataset/resolve/main/ultra_premium_scam_dataset.csv"
curl -sL -o clove.parquet "$H/CloveAI/india-spam-sms/resolve/main/data/train-00000-of-00001.parquet"
curl -sL -o ridham.csv "$H/Ridham115/indian-scam-sms-synthetic-audited/resolve/main/data/synthetic_audited.csv"
ls -la
