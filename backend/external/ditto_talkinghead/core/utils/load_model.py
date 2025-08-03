def load_model(model_path: str, device: str = "cpu", **kwargs):
    if kwargs.get("force_ori_type", False):
        # for hubert, landmark, retinaface, mediapipe
        model = load_force_ori_type(model_path, device, **kwargs)
        return model, "ori"

    if model_path.endswith(".onnx"):
        # onnx
        import onnxruntime

        if device == "cuda":
            providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
        else:
            providers = ["CPUExecutionProvider"]
        model = onnxruntime.InferenceSession(model_path, providers=providers)
        return model, "onnx"

    elif model_path.endswith(".engine") or model_path.endswith(".trt"):
        # tensorRT
        from .tensorrt_utils import TRTWrapper

        model = TRTWrapper(model_path)
        return model, "tensorrt"

    elif model_path.endswith(".pt") or model_path.endswith(".pth"):
        # pytorch
        model = create_model(model_path, device, **kwargs)
        return model, "pytorch"

    else:
        raise ValueError(f"Unsupported model file type: {model_path}")


def create_model(
    model_path: str,
    device: str = "cpu",
    module_name="",
    package_name="..models.modules",
    **kwargs,
):
    import importlib
    import torch

    # module = getattr(importlib.import_module('..models.modules', __package__), module_name)
    module = getattr(importlib.import_module(package_name, __package__), module_name)
    # from <package_name> import <module_name>

    model = module(**kwargs)
    loaded_model = model.load_model(model_path)

    if device == "cpu":
        loaded_model = loaded_model.to(device)
    else:
        # 如果有 cuda 且可用再移動
        if torch.cuda.is_available():
            loaded_model = loaded_model.to(device)
        else:
            print("CUDA 不可用，使用 CPU")
            loaded_model = loaded_model.to("cpu")

    return loaded_model


def load_force_ori_type(
    model_path: str,
    device: str = "cpu",
    module_name="",
    package_name="..aux_models.modules",
    force_ori_type=False, 
    **kwargs,
):
    import importlib

    module = getattr(importlib.import_module(package_name, __package__), module_name)
    model = module(**kwargs)
    return model
