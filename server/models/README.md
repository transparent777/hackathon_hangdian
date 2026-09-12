# Local segmentation model

`u2netp.onnx` is the foreground segmentation model used by the hybrid blend
pipeline. It runs locally through ONNX Runtime. The pipeline applies it to a
tight planned-character crop and combines its saliency output with the pixel
change between the original image and the Seedream candidate.

Source: https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx

SHA-256: `309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8`
