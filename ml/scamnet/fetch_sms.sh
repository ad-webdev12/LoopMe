#!/bin/sh
# Extra public text-message sets for ScamNet Lite (the model the text filter
# runs). Downloads into ml/scamnet/raw/sms (not committed).
set -e
D="$(dirname "$0")/raw/sms"; mkdir -p "$D"; cd "$D"; H=https://huggingface.co/datasets
g(){ curl -sfL -o "$1" "$H/$2" || echo "failed $1"; }
g notd5a.csv notd5a/malicious-benign-sms-mms-dataset/resolve/main/original_dataset_v2_undersampled_stratified.csv
g mshenoda_train.csv mshenoda/spam-messages/resolve/main/spam_messages_train.csv
g mshenoda_test.csv mshenoda/spam-messages/resolve/main/spam_messages_test.csv
g india.csv anmolshrivastav/scam-ham-india/resolve/main/scam_hum_india.csv
g sidz_train.jsonl sidzzz07/scamshield-dataset/resolve/main/train.jsonl
g sidz_test.jsonl sidzzz07/scamshield-dataset/resolve/main/test.jsonl
g tanu_train.parquet tanu011235/scam-alert-dataset/resolve/main/data/train-00000-of-00001.parquet
g tanu_test.parquet tanu011235/scam-alert-dataset/resolve/main/data/test-00000-of-00001.parquet
g phonescam_train.csv menaattia/phone-scam-dataset/resolve/main/train_dataset.csv
g phonescam_test.csv menaattia/phone-scam-dataset/resolve/main/test_dataset.csv
g africa.parquet electricsheepafrica/africa-smishing-sms-phishing/resolve/main/data/train-00000-of-00001.parquet
g sift_train.csv Gwen1220/sift-sms-dataset/resolve/main/train-850.csv
g sift_test.csv Gwen1220/sift-sms-dataset/resolve/main/test-75.csv
ls -la
