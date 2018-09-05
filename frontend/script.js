$(document).ready(() => {
  
  // when the form is submitted
  $('#crawl-form').on('submit', (e) => {

    // if the validator does not prevent form submit
    if (!e.isDefaultPrevented()) {
      e.preventDefault();
      let url = "http://localhost:3001/";

      let jsonObj = {};
      jsonObj["url"] = $("#url").val();
      jsonObj["delay"] = Number($("#delay").val()) * 1000;

      // POST values in the background the the script URL
      $.ajax({
        type: "POST",
        url: url,
        data: JSON.stringify(jsonObj),
        contentType:"application/json",
        success: (data) => {
          // let's compose an image tag with returned image
          let img = "<img src='data:image/png;base64, " + data.screenshot + "'/>";
          $('.result').html(img);
          $('.result-text').html("<h3>Detected " + data.adsDetected + " ad labels</h3>");
          $(".loader").hide();
          $('#crawl-form').show();
          $('.result').show();
          $('.result-text').show();
        },
        error: (err) => {
          console.log(err.statusText);
          $(".loader").hide();
          $('#crawl-form').show();
          $('.result-text').html("Error: " + err);
          $('.result-text').show();    
        }
      });
      $(".loader").show();
      $('#crawl-form').hide();
      $('.result').hide();
      $('.result-text').hide();

      return false;
    }
  })
});