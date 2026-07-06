#!/bin/bash
gcloud config set project avocast
gcloud run deploy --source . avocast

