# AI-Powered Waste Classification System
*A School Project for Sustainable Waste Management*  

An accessible trash-classification tool built using **Google’s Teachable Machine** and **TensorFlow**, designed to help users correctly sort recyclable materials and reduce contamination.
## Features
- 🖼️ **Image-based classification** for recyclables (paper, plastic, cardboard, metal, glass, and trash)  
- 📊 Trained on real-world datasets 
- 🚫 **Reduces contamination** from misplaced items (e.g., pizza boxes in paper bins)  
- 🌱 **No-code friendly** – ideal for eco-clubs, schools, and local communities  
- 🔄 **Retrainable** with local waste examples for improved accuracy  

## Datasets Used
This project leverages the following open datasets:

1. **[TrashNet](https://github.com/garythung/trashnet)**  
   - A labeled dataset of ~2.5k images across 6 categories (paper, plastic, metal, etc.).  
   - Citation:  
     ```bibtex
     @misc{Thung2016,
       author = {Gary Thung and Yang Yang},
       title = {TrashNet},
       year = {2016},
       howpublished = {GitHub repository},
       url = {https://github.com/garythung/trashnet}
     }
     ```

2. **Kaggle Datasets**  
   - **[Recycle-Dataset](https://www.kaggle.com/datasets/kandatiharshavardhan/recycle-dataset/data)**  
     - 12,000+ images of recyclable materials (glass, metal, paper, plastic).  
   - **[Garbage Classification V2](https://www.kaggle.com/datasets/sumn2u/garbage-classification-v2/data)**  
     - 15,000 images across 5 categories (organic, recyclable, etc.).  

3. **[RealWaste](https://www.mdpi.com/2078-2489/14/12/633)**  
   - A novel real-life dataset for landfill waste classification (7,500+ images).  
   - Citation:  
     ```bibtex
     @article{RealWaste2023,
       title = {RealWaste: A Novel Real-Life Data Set for Landfill Waste Classification Using Deep Learning},
       author = {Dias, Ugo and Pereira, Pedro J. and Morgado, Luís and Santos, Luís},
       journal = {Information},
       volume = {14},
       year = {2023},
       doi = {10.3390/info14120633}
     }
     ```

## How It Works
1. Users upload an image of waste or use the webcam.  
2. The **TensorFlow.js** model classifies it as recyclable/non-recyclable.  

## Setup
1. Access the Teachable Machine project [here](#https://23021199.github.io/No-More-Guess-Work/).  
2. To retrain with local data:  
   - Collect images of regional waste items.  
   - Upload to Teachable Machine and fine-tune the model.  

## Impact
- ♻️ **Educates communities** on proper waste sorting.  
- 🤖 **Democratizes AI** for sustainability efforts.  
- 📉 Aims to reduce recycling contamination rates.  

## License
Open-source under [MIT License](LICENSE). Dataset usage complies with original licenses (CC-BY for TrashNet, Kaggle terms, and MDPI’s CC-BY 4.0 for RealWaste).  

