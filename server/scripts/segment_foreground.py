import argparse

import numpy as np
import onnxruntime as ort
from PIL import Image, ImageFilter


def parse_region(value):
    parts = [int(item) for item in value.split(",")]
    if len(parts) != 4 or parts[2] <= 0 or parts[3] <= 0:
        raise ValueError("region must be x,y,width,height")
    return parts


def preprocess(image, size):
    resized = image.resize((size, size), Image.Resampling.LANCZOS)
    array = np.asarray(resized, dtype=np.float32) / 255.0
    mean = np.asarray([0.485, 0.456, 0.406], dtype=np.float32)
    std = np.asarray([0.229, 0.224, 0.225], dtype=np.float32)
    array = (array - mean) / std
    return np.transpose(array, (2, 0, 1))[None, ...]


def normalize_mask(prediction):
    prediction = prediction.squeeze().astype(np.float32)
    low = float(prediction.min())
    high = float(prediction.max())
    if high - low < 1e-6:
        raise RuntimeError("segmentation model returned a flat mask")
    return (prediction - low) / (high - low)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True)
    parser.add_argument("--source", required=True)
    parser.add_argument("--candidate", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--region", required=True)
    args = parser.parse_args()

    source = Image.open(args.source).convert("RGB")
    candidate = Image.open(args.candidate).convert("RGB").resize(source.size, Image.Resampling.LANCZOS)
    x, y, width, height = parse_region(args.region)
    crop = candidate.crop((x, y, x + width, y + height))

    session = ort.InferenceSession(args.model, providers=["CPUExecutionProvider"])
    model_input = session.get_inputs()[0]
    input_size = int(model_input.shape[-1])
    output = session.run(
        [session.get_outputs()[0].name],
        {model_input.name: preprocess(crop, input_size)},
    )[0]
    mask = normalize_mask(output)
    mask_image = Image.fromarray(np.uint8(mask * 255), mode="L")
    mask_image = mask_image.resize((width, height), Image.Resampling.LANCZOS).filter(ImageFilter.GaussianBlur(0.7))

    canvas = Image.new("L", source.size, 0)
    canvas.paste(mask_image, (x, y))
    canvas.save(args.output)


if __name__ == "__main__":
    main()
