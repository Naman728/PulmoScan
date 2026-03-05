"""
CT model architecture matching the state_dict from ct_model/ (extracted PyTorch zip).
Features: VGG-style 13 convs (64,64,128,128,256,256,256,512,512,512,512,512,512), 4 pools, then AdaptiveAvgPool2d(7).
Head: shared_fc (25088->1024, BN, 1024->512, BN), then 7 heads each (512->128, 128->1).
We use the first 4 heads for 4-class CT diagnosis (Normal, Stroke, Tumor, Hemorrhage).
"""
import torch
import torch.nn as nn


def _make_layers(cfg):
    """Build VGG-style features from config. cfg: list of channel counts and 'M' for maxpool."""
    layers = []
    in_ch = 3
    for v in cfg:
        if v == "M":
            layers.append(nn.MaxPool2d(kernel_size=2, stride=2))
        else:
            layers.append(nn.Conv2d(in_ch, v, kernel_size=3, padding=1))
            layers.append(nn.ReLU(inplace=True))
            in_ch = v
    return nn.Sequential(*layers)


# 13 convs: 64,64 M 128,128 M 256,256,256 M 512,512,512 M 512,512,512 -> indices 0,2,5,7,10,12,14,17,19,21,24,26,28
FEATURES_CFG = [64, 64, "M", 128, 128, "M", 256, 256, 256, "M", 512, 512, 512, "M", 512, 512, 512]


class CTBrainModel(nn.Module):
    def __init__(self, num_heads=7, num_classes_used=4):
        super().__init__()
        self.num_heads = num_heads
        self.num_classes_used = num_classes_used
        self.features = _make_layers(FEATURES_CFG)
        self.avgpool = nn.AdaptiveAvgPool2d((7, 7))
        self.shared_fc = nn.Sequential(
            nn.Linear(512 * 7 * 7, 1024),
            nn.BatchNorm1d(1024),
            nn.ReLU(inplace=True),
            nn.Dropout(0.5),
            nn.Linear(1024, 512),
            nn.BatchNorm1d(512),
            nn.ReLU(inplace=True),
            nn.Dropout(0.5),
        )
        self.heads = nn.ModuleList()
        for _ in range(num_heads):
            self.heads.append(
                nn.Sequential(
                    nn.Linear(512, 128),
                    nn.ReLU(inplace=True),
                    nn.Dropout(0.5),
                    nn.Linear(128, 1),
                )
            )

    def forward(self, x):
        x = self.features(x)
        x = self.avgpool(x)
        x = torch.flatten(x, 1)
        x = self.shared_fc(x)
        # Stack all head outputs -> (B, num_heads)
        out = torch.cat([h(x) for h in self.heads], dim=1)
        return out
