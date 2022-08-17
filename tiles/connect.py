
import os
import sys
import json
import cv2

def concat_vh(tiles):
    return cv2.vconcat([cv2.hconcat(list_h) for list_h in tiles])

def init(location):
    f = open(f"{os.getcwd()}/locations/{location}/images.json")
    img_paths = json.load(f)
    img_tile = concat_vh([[cv2.imread(i) for i in row] for row in img_paths])
    cv2.imwrite(f"{os.getcwd()}/locations/{location}/{location}.jpg", img_tile)
    print(f"{os.getcwd()}/locations/{location}/{location}.jpg")

init(sys.argv[1])

