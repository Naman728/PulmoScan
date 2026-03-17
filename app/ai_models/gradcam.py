"""
Grad-CAM explainability for PyTorch CT model.
Generates heatmap and overlay; does not modify the model or prediction pipeline.
"""
import logging
import os
from typing import Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)


def run_gradcam(
    model,
    input_tensor,
    target_class_idx: Optional[int] = None,
    target_layer=None,
) -> Tuple[Optional[np.ndarray], Optional[np.ndarray]]:
    """
    Run Grad-CAM on the model for the given input.
    Returns (heatmap_2d, overlay_rgb) as numpy arrays, or (None, None) on failure.
    """
    try:
        import torch
        import torch.nn as nn
    except ImportError:
        logger.warning("Grad-CAM skipped: torch not available")
        return None, None

    if model is None or input_tensor is None:
        return None, None

    try:
        if target_layer is None:
            if hasattr(model, "features"):
                import torch.nn as nn
                target_layer = model.features[-1] if isinstance(model.features, nn.Sequential) else model.features
            else:
                import torch.nn as nn
                for module in reversed(list(model.modules())):
                    if isinstance(module, nn.Conv2d):
                        target_layer = module
                        break
        if target_layer is None:
            logger.error("Grad-CAM failed: no convolutional layer found")
            return None, None
        logger.info("GradCAM using layer: %s", target_layer)

        saved_activation = []
        saved_grad = []

        def forward_hook(module, inp, out):
            saved_activation.append(out.detach())

        def backward_hook(module, grad_in, grad_out):
            saved_grad.append(grad_out[0].detach())

        handle_f = target_layer.register_forward_hook(forward_hook)
        handle_b = target_layer.register_backward_hook(backward_hook)

        try:
            model.eval()
            input_tensor = input_tensor.requires_grad_(True)
            out = model(input_tensor)
            if isinstance(out, (list, tuple)):
                out = out[0]
            if out.dim() == 2 and out.shape[1] >= 1:
                if target_class_idx is not None and target_class_idx < out.shape[1]:
                    score = out[0, target_class_idx]
                else:
                    score = out[0].max()
            else:
                score = out.sum()
            model.zero_grad()
            score.backward()

            if not saved_activation or not saved_grad:
                return None, None

            activation = saved_activation[0]
            grad = saved_grad[0]
            weights = grad.mean(dim=(2, 3))
            cam = (weights.unsqueeze(-1).unsqueeze(-1) * activation).sum(dim=1)
            cam = torch.relu(cam)
            cam = cam[0].cpu().numpy()
            cam = np.maximum(cam, 0)
            if cam.size == 0:
                return None, None
            cam = cam / (cam.max() + 1e-8)
            target_h, target_w = input_tensor.shape[2], input_tensor.shape[3]
            try:
                from PIL import Image
                cam_pil = Image.fromarray(np.uint8(255 * cam))
                cam_pil = cam_pil.resize((target_w, target_h), Image.BILINEAR)
                heatmap = np.array(cam_pil)
            except Exception:
                heatmap = np.uint8(255 * cam)
            return heatmap, None
        finally:
            handle_f.remove()
            handle_b.remove()
    except Exception as e:
        logger.error("Grad-CAM failed: %s", e)
        return None, None


def heatmap_to_overlay(heatmap_2d: np.ndarray, original_image: np.ndarray) -> Optional[np.ndarray]:
    """
    Create overlay image: original scan with heatmap colormap on top.
    original_image: (H, W, 3) in [0, 255] or (H, W).
    Returns (H, W, 3) uint8 overlay or None.
    """
    try:
        import cv2
    except ImportError:
        try:
            from PIL import Image
            heatmap_uint8 = np.uint8(np.clip(heatmap_2d, 0, 255))
            if heatmap_uint8.ndim == 2:
                heatmap_uint8 = np.stack([heatmap_uint8] * 3, axis=-1)
            orig = np.array(original_image)
            if orig.ndim == 2:
                orig = np.stack([orig, orig, orig], axis=-1)
            orig = np.uint8(np.clip(orig * 255 if orig.max() <= 1 else orig, 0, 255))
            h, w = heatmap_2d.shape
            orig = np.array(Image.fromarray(orig).resize((w, h))) if orig.shape[:2] != (h, w) else orig
            overlay = np.uint8(0.5 * orig + 0.5 * heatmap_uint8)
            return overlay
        except Exception:
            return None

    try:
        h, w = heatmap_2d.shape
        heatmap_uint8 = np.uint8(np.clip(heatmap_2d, 0, 255))
        heatmap_rgb = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)
        heatmap_rgb = cv2.cvtColor(heatmap_rgb, cv2.COLOR_BGR2RGB)
        if original_image.ndim == 2:
            original_image = np.stack([original_image] * 3, axis=-1)
        if original_image.max() <= 1.0:
            original_image = np.uint8(255 * np.clip(original_image, 0, 1))
        else:
            original_image = np.uint8(np.clip(original_image, 0, 255))
        orig = cv2.resize(original_image, (w, h)) if original_image.shape[:2] != (h, w) else original_image
        overlay = np.uint8(0.5 * orig + 0.5 * heatmap_rgb)
        return overlay
    except Exception as e:
        logger.error("Overlay creation failed: %s", e)
        return None


def save_heatmap_and_overlay(
    heatmap_2d: np.ndarray,
    original_image: np.ndarray,
    output_dir: str,
) -> Tuple[Optional[str], Optional[str], Optional[np.ndarray]]:
    """
    Professional radiology-style visualization: normalize activation map, JET heatmap,
    and Grad-CAM overlay. Saves heatmap.png and gradcam_overlay.png under output_dir.
    Returns (heatmap_path, gradcam_overlay_path, heatmap_uint8) for use in deviation/regions.
    """
    if not output_dir or not output_dir.strip():
        return None, None, None
    try:
        import cv2
        output_dir = output_dir.strip()
        os.makedirs(output_dir, exist_ok=True)
        heatmap_path = os.path.join(output_dir, "heatmap.png")
        gradcam_overlay_path = os.path.join(output_dir, "gradcam_overlay.png")
        overlay_path = os.path.join(output_dir, "overlay.png")

        if heatmap_2d is None or original_image is None:
            return None, None, None

        # STEP 1 — Normalize the model activation map
        heatmap = np.asarray(heatmap_2d, dtype=np.float64)
        if heatmap.ndim == 3:
            heatmap = heatmap.mean(axis=-1)
            
        heatmap = np.maximum(heatmap, 0)
        if heatmap.max() > 0:
            heatmap /= heatmap.max()
            
        logger.info("Heatmap range: %s %s", heatmap.min(), heatmap.max())
        heatmap_uint8 = np.uint8(255 * heatmap)

        h, w = heatmap_uint8.shape

        # STEP 2 — Generate colored medical heatmap (JET: red/yellow = anomaly)
        heatmap_color_bgr = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)
        cv2.imwrite(heatmap_path, cv2.cvtColor(heatmap_color_bgr, cv2.COLOR_BGR2RGB))

        # STEP 3 — Create Grad-CAM overlay: blend CT + colored heatmap
        patient_ct = np.asarray(original_image, dtype=np.uint8)
        if patient_ct.ndim == 2:
            patient_ct = cv2.cvtColor(patient_ct, cv2.COLOR_GRAY2BGR)
        elif patient_ct.shape[-1] == 3:
            patient_ct = cv2.cvtColor(patient_ct, cv2.COLOR_RGB2BGR)
        if patient_ct.max() <= 1:
            patient_ct = np.uint8(255 * np.clip(patient_ct, 0, 1))
        if (patient_ct.shape[0], patient_ct.shape[1]) != (h, w):
            heatmap_color_bgr = cv2.resize(heatmap_color_bgr, (patient_ct.shape[1], patient_ct.shape[0]))
        overlay = cv2.addWeighted(patient_ct, 0.6, heatmap_color_bgr, 0.4, 0)
        cv2.imwrite(gradcam_overlay_path, cv2.cvtColor(overlay, cv2.COLOR_BGR2RGB))
        cv2.imwrite(overlay_path, cv2.cvtColor(overlay, cv2.COLOR_BGR2RGB))
        return heatmap_path, gradcam_overlay_path, heatmap_uint8
    except Exception as e:
        logger.error("Save heatmap/overlay failed: %s", e)
        return None, None, None
