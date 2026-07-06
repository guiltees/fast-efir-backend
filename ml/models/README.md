# Scam classifier model artifacts

This directory is the filesystem-backed model registry served by
`GET /scam/models/:version/file` and `GET /scam/models/:version/vocab`.

Expected layout:

```
ml/models/
  v1.0.0.tflite
  v1.0.0.vocab.txt
  v1.0.1.tflite
  v1.0.1.vocab.txt
```

Where the files come from:

1. Train the classifier with `ml-pipeline/train_bert_lite.py`.
2. Export TFLite with `ml-pipeline/export_tflite.py`.
3. Copy both outputs into this folder, versioned.

The controller rejects filenames that don't match `/^v?[\w.\-]{1,40}$/`, so
stick to semver-style strings (e.g. `v1.2.3`).

Production note: swap `res.sendFile` for a signed CDN redirect when traffic
grows beyond what a single Render dyno can serve.
