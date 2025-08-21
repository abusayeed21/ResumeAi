import React, { useState, useRef } from 'react';
import './App.css';

const ResumeAnalyzer = () => {
  const [file, setFile] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file) => {
    if (file.type !== 'application/pdf' && file.type !== 'application/msword' && file.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      setError('Please upload a PDF or Word document');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }
    
    setError(null);
    setFile(file);
  };

  const analyzeResume = async () => {
    if (!file) {
      setError('Please upload a resume first');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // In a real implementation, you would upload the file to your server
      // and then call the OpenRouter API from there for security
      
      // This is a mock implementation for demonstration purposes
      setTimeout(() => {
        const mockResult = {
          score: 78,
          atsFriendly: true,
          strengths: [
            "Clear contact information",
            "Well-structured experience section",
            "Good use of action verbs"
          ],
          improvements: [
            "Add more quantifiable achievements",
            "Include more relevant keywords for your industry",
            "Shorten your summary to 3-4 lines maximum"
          ],
          keywords: {
            missing: ["Python", "React", "Agile"],
            found: ["JavaScript", "Team Management", "Project Leadership"]
          },
          summary: "Your resume has a good structure but could be improved with more industry-specific keywords and quantifiable results."
        };
        
        setAnalysisResult(mockResult);
        setLoading(false);
      }, 2000);
      
      // Actual API implementation would look something like this:
      /*
      const formData = new FormData();
      formData.append('resume', file);
      
      const response = await fetch('YOUR_BACKEND_ENDPOINT', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Analysis failed');
      }
      
      const result = await response.json();
      setAnalysisResult(result);
      setLoading(false);
      */
    } catch (err) {
      setError('Failed to analyze resume. Please try again.');
      setLoading(false);
    }
  };

  const resetAnalysis = () => {
    setFile(null);
    setAnalysisResult(null);
    setError(null);
  };

  return (
    <div className="resume-analyzer">
      <header className="header">
        <div className="container">
          <div className="logo">
            <i className="fas fa-file-alt"></i>
            <span>ResumeIQ</span>
          </div>
          <nav className="nav">
            <a href="#how-it-works">How It Works</a>
            <a href="#benefits">Benefits</a>
            <a href="#contact">Contact</a>
          </nav>
        </div>
      </header>

      <main className="main">
        <section className="hero">
          <div className="container">
            <div className="hero-content">
              <h1>AI-Powered Resume Analysis</h1>
              <p>Upload your resume and get instant feedback on its ATS compatibility, content quality, and improvement suggestions to land your dream job.</p>
              <button className="cta-button" onClick={analyzeResume} disabled={loading}>
                {loading ? 'Analyzing...' : 'Get Started'} 
                <i className="fas fa-arrow-right"></i>
              </button>
            </div>
            <div className="hero-visual">
              <div className="floating-card">
                <i className="fas fa-chart-line"></i>
                <h3>ATS Score</h3>
                <div className="score">92%</div>
              </div>
              <div className="floating-card">
                <i className="fas fa-bolt"></i>
                <h3>Quick Analysis</h3>
                <div className="time">30s</div>
              </div>
              <div className="floating-card">
                <i className="fas fa-lightbulb"></i>
                <h3>Smart Suggestions</h3>
                <div className="count">12+</div>
              </div>
            </div>
          </div>
        </section>

        <section className="upload-section">
          <div className="container">
            <div className="section-header">
              <h2>Upload Your Resume</h2>
              <p>Supported formats: PDF, DOC, DOCX (Max 5MB)</p>
            </div>
            
            <div 
              className={`upload-area ${dragActive ? 'active' : ''} ${file ? 'has-file' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleChange}
                accept=".pdf,.doc,.docx"
                style={{ display: 'none' }}
              />
              
              <div className="upload-content">
                {file ? (
                  <>
                    <i className="fas fa-file-alt"></i>
                    <h3>{file.name}</h3>
                    <p>Click to change file</p>
                  </>
                ) : (
                  <>
                    <i className="fas fa-cloud-upload-alt"></i>
                    <h3>Drag & drop your resume here</h3>
                    <p>or click to browse files</p>
                  </>
                )}
              </div>
            </div>
            
            {error && (
              <div className="error-message">
                <i className="fas fa-exclamation-circle"></i>
                {error}
              </div>
            )}
            
            <div className="action-buttons">
              <button 
                className="analyze-button" 
                onClick={analyzeResume}
                disabled={!file || loading}
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <i className="fas fa-search"></i>
                    Analyze Resume
                  </>
                )}
              </button>
              
              {file && (
                <button className="reset-button" onClick={resetAnalysis}>
                  <i className="fas fa-times"></i>
                  Reset
                </button>
              )}
            </div>
          </div>
        </section>

        {analysisResult && (
          <section className="results-section">
            <div className="container">
              <div className="section-header">
                <h2>Analysis Results</h2>
                <p>Based on our AI analysis of your resume</p>
              </div>
              
              <div className="score-display">
                <div className="score-circle">
                  <div className="circle-background"></div>
                  <div className="circle-progress" style={{ '--score': `${analysisResult.score}%` }}></div>
                  <div className="score-text">
                    <span className="score-value">{analysisResult.score}%</span>
                    <span className="score-label">ATS Score</span>
                  </div>
                </div>
                
                <div className="score-status">
                  <span className={`status ${analysisResult.atsFriendly ? 'good' : 'bad'}`}>
                    {analysisResult.atsFriendly ? 'ATS Friendly' : 'Needs Improvement'}
                  </span>
                </div>
              </div>
              
              <div className="results-grid">
                <div className="result-card">
                  <div className="card-header">
                    <i className="fas fa-check-circle"></i>
                    <h3>Strengths</h3>
                  </div>
                  <ul>
                    {analysisResult.strengths.map((strength, index) => (
                      <li key={index}>{strength}</li>
                    ))}
                  </ul>
                </div>
                
                <div className="result-card">
                  <div className="card-header">
                    <i className="fas fa-exclamation-triangle"></i>
                    <h3>Areas for Improvement</h3>
                  </div>
                  <ul>
                    {analysisResult.improvements.map((improvement, index) => (
                      <li key={index}>{improvement}</li>
                    ))}
                  </ul>
                </div>
                
                <div className="result-card">
                  <div className="card-header">
                    <i className="fas fa-key"></i>
                    <h3>Keyword Analysis</h3>
                  </div>
                  <div className="keywords">
                    <div className="keyword-section">
                      <h4>Keywords Found</h4>
                      <div className="keyword-list">
                        {analysisResult.keywords.found.map((keyword, index) => (
                          <span key={index} className="keyword-tag found">{keyword}</span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="keyword-section">
                      <h4>Missing Keywords</h4>
                      <div className="keyword-list">
                        {analysisResult.keywords.missing.map((keyword, index) => (
                          <span key={index} className="keyword-tag missing">{keyword}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="result-card full-width">
                  <div className="card-header">
                    <i className="fas fa-comment"></i>
                    <h3>Summary</h3>
                  </div>
                  <p>{analysisResult.summary}</p>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="how-it-works" id="how-it-works">
          <div className="container">
            <div className="section-header">
              <h2>How It Works</h2>
              <p>Our AI-powered analysis helps you create the perfect resume</p>
            </div>
            
            <div className="steps">
              <div className="step">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h3>Upload Your Resume</h3>
                  <p>Upload your existing resume in PDF or Word format</p>
                </div>
              </div>
              
              <div className="step">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h3>AI Analysis</h3>
                  <p>Our advanced AI scans your resume for key components</p>
                </div>
              </div>
              
              <div className="step">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h3>Get Detailed Feedback</h3>
                  <p>Receive actionable suggestions to improve your resume</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <div className="logo">
                <i className="fas fa-file-alt"></i>
                <span>ResumeIQ</span>
              </div>
              <p>AI-powered resume analysis to help you land more interviews and get hired faster.</p>
              <div className="social-links">
                <a href="#"><i className="fab fa-facebook-f"></i></a>
                <a href="#"><i className="fab fa-twitter"></i></a>
                <a href="#"><i className="fab fa-linkedin-in"></i></a>
                <a href="#"><i className="fab fa-instagram"></i></a>
              </div>
            </div>
            
            <div className="footer-section">
              <h3>Quick Links</h3>
              <ul>
                <li><a href="#">Home</a></li>
                <li><a href="#how-it-works">How It Works</a></li>
                <li><a href="#benefits">Benefits</a></li>
                <li><a href="#contact">Contact</a></li>
              </ul>
            </div>
            
            <div className="footer-section">
              <h3>Legal</h3>
              <ul>
                <li><a href="#">Privacy Policy</a></li>
                <li><a href="#">Terms of Service</a></li>
                <li><a href="#">Data Security</a></li>
              </ul>
            </div>
            
            <div className="footer-section">
              <h3>Contact Us</h3>
              <ul>
                <li><i className="fas fa-envelope"></i> support@resumeiq.com</li>
                <li><i className="fas fa-phone"></i> +1 (555) 123-4567</li>
                <li><i className="fas fa-map-marker-alt"></i> New York, NY</li>
              </ul>
            </div>
          </div>
          
          <div className="footer-bottom">
            <p>&copy; 2023 ResumeIQ. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ResumeAnalyzer;
