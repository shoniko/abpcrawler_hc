# Based on https://opencv-python-tutroals.readthedocs.io/en/latest/py_tutorials/py_imgproc/py_template_matching/py_template_matching.html
import cv2
import numpy as np
import os
import sys
import json
import glob

def main():
    if len(sys.argv) < 2:
        print("detectAdLabel.py [JSON_OBJECT_AS_STRING]")
        return

    # Load ad labels
    templatesArray = []
    listOfFiles = glob.glob("adlabels/*.png")
    for filePath in listOfFiles:
        templatesArray.extend([cv2.imread(filePath, 0)])

    # Load target image
    inputParam = json.loads(sys.argv[1])
    page_screenshot = cv2.imread(inputParam["screenshotPath"])
    img_gray = cv2.cvtColor(page_screenshot, cv2.COLOR_BGR2GRAY)

    adsFound = 0

    for template in templatesArray:
        w, h = template.shape[::-1]

        res = cv2.matchTemplate(img_gray,template,cv2.TM_CCOEFF_NORMED)
        threshold = 0.8
        loc = np.where( res >= threshold)
        for pt in zip(*loc[::-1]):
            cv2.rectangle(page_screenshot, pt, (pt[0] + w, pt[1] + h), (0,0,255), 2)
            adsFound += 1

    if adsFound > 0:
        cv2.imwrite(inputParam["screenshotPath"], page_screenshot)

    print(adsFound)


if __name__ == "__main__":
    main()