//
//  ShareViewController.swift
//  BookYoloShareExtension
//
//  Share Extension for BookYolo - Allows users to scan Airbnb listings from Safari
//

import UIKit
import Social
import UniformTypeIdentifiers

class ShareViewController: SLComposeServiceViewController {
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // Set placeholder text
        self.placeholder = "Scan with BookYolo"
    }
    
    override func isContentValid() -> Bool {
        // Validate content - we need a URL
        return true
    }
    
    override func didSelectPost() {
        // Called when user taps Post
        
        // Get the shared URL
        guard let extensionItem = extensionContext?.inputItems.first as? NSExtensionItem,
              let itemProvider = extensionItem.attachments?.first else {
            self.extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
            return
        }
        
        // Check if the item is a URL
        if itemProvider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
            itemProvider.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { [weak self] (item, error) in
                guard let self = self else { return }
                
                if let url = item as? URL {
                    // Open the main app with the shared URL
                    self.openMainApp(with: url.absoluteString)
                } else if let urlString = item as? String, let url = URL(string: urlString) {
                    self.openMainApp(with: url.absoluteString)
                }
                
                self.extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
            }
        } else if itemProvider.hasItemConformingToTypeIdentifier(UTType.propertyList.identifier) {
            // Handle property list format
            itemProvider.loadItem(forTypeIdentifier: UTType.propertyList.identifier, options: nil) { [weak self] (item, error) in
                guard let self = self else { return }
                
                if let dict = item as? [String: Any],
                   let results = dict[NSExtensionJavaScriptPreprocessingResultsKey] as? [String: Any],
                   let urlString = results["URL"] as? String {
                    self.openMainApp(with: urlString)
                }
                
                self.extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
            }
        } else {
            // Fallback - try to get text content
            if itemProvider.hasItemConformingToTypeIdentifier(UTType.text.identifier) {
                itemProvider.loadItem(forTypeIdentifier: UTType.text.identifier, options: nil) { [weak self] (item, error) in
                    guard let self = self else { return }
                    
                    if let text = item as? String {
                        // Try to extract URL from text
                        if let url = URL(string: text), url.scheme != nil {
                            self.openMainApp(with: text)
                        }
                    }
                    
                    self.extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
                }
            } else {
                self.extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
            }
        }
    }
    
    private func openMainApp(with url: String) {
        // Open the web app with the shared URL
        let webAppURL = "https://bookyolo-frontend.vercel.app/scan?url=\(url.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? url)"
        
        guard let webURL = URL(string: webAppURL) else {
            self.extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
            return
        }
        
        // Open the web app in Safari
        DispatchQueue.main.async {
            if let sharedApplication = UIApplication.shared as? UIApplication {
                sharedApplication.open(webURL, options: [:], completionHandler: { success in
                    self.extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
                })
            } else {
                self.extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
            }
        }
    }
    
    override func configurationItems() -> [Any]! {
        // Return empty array - we don't need additional configuration
        return []
    }
}










